/**
 * Shell Volume Mixer
 *
 * Volume menu item implementation.
 *
 * @author Alexander Hofbauer <alex@derhofbauer.at>
 */

/* exported Menu */

const Gvc = imports.gi.Gvc;
const Lang = imports.lang;
const Lib = imports.misc.extensionUtils.getCurrentExtension().imports.lib;
const PopupMenu = imports.ui.popupMenu;

const { Settings } = Lib.settings;
const Volume = Lib.widget.volume;
const Utils = Lib.utils.utils;


var Menu = new Lang.Class({
    Name: 'ShellVolumeMixerMenu',
    Extends: Volume.VolumeMenu,

    _init(mixer, options) {
        // no this.parent(); shouldn't go through VolumeMenu's setup
        PopupMenu.PopupMenuSection.prototype._init.call(this);

        this._settings = new Settings();

        this.options = {
            detailed: this._settings.get_boolean('show-detailed-sliders'),
            systemSounds: this._settings.get_boolean('show-system-sounds'),
            virtualStreams: this._settings.get_boolean('show-virtual-streams'),
            symbolicIcons: this._settings.get_boolean('use-symbolic-icons'),
            alwaysShowInputStreams: this._settings.get_boolean('always-show-input-streams')
        };

        // master-menu items
        this._outputs = {};
        // input-menu items
        this._inputs = {};
        // menu items (all other menu items)
        this._items = {};

        this._mixer = mixer;
        this._control = mixer.control;

        let signals = {
            'state-changed': this._onControlStateChanged,
            'default-sink-changed': this._readOutput,
            'default-source-changed': this._readInput,
            'stream-added': this._streamAdded,
            'stream-removed': this._streamRemoved,
            'stream-changed': this._streamChanged
        };

        for (let name in signals) {
            try {
                mixer.connect(name, signals[name].bind(this));
            } catch (exception) {
                Utils.info('Could not connect to signal -', exception);
            }
        }


        this._output = new Volume.MasterSlider(this._control, {
            mixer: mixer,
            detailed: this.options.detailed,
            symbolicIcons: this.options.symbolicIcons
        });

        this._output.connect('stream-updated', function() {
            this.emit('icon-changed');
        }.bind(this));


        this._inputMenu = new Volume.AggregatedInput(this._control, {
            mixer: mixer,
            detailed: this.options.detailed,
            symbolicIcons: this.options.symbolicIcons
        });


        this._input = new Volume.InputStreamSlider(this._control, {
            mixer: mixer,
            showAlways: this.options.alwaysShowInputStreams,
            detailed: this.options.detailed,
            symbolicIcons: this.options.symbolicIcons
        });


        this.addMenuItem(this._output.item, 0);
        this.addMenuItem(this._inputMenu.item, 2);
        this._inputMenu.setInputStream(this._input);

        if (options.separator) {
            this._addSeparator();
        }

        this._onControlStateChanged();
    },

    open(animate) {
        this._output.hideVolumeInfo();
        this.parent(animate);
    },

    close(animate) {
        for (let id in this._outputs) {
            this._outputs[id].hideVolumeInfo();
        }

        for (let id in this._inputs) {
            this._inputs[id].hideVolumeInfo();
        }

        for (let id in this._items) {
            this._items[id].hideVolumeInfo();
        }

        this._output.hideVolumeInfo();

        this.parent(animate);
    },

    outputHasHeadphones() {
        return this._output._hasHeadphones;
    },

    _addSeparator() {
        if (this._separator) {
            this._separator.destroy();
        }

        this._separator = new PopupMenu.PopupSeparatorMenuItem();
        this.addMenuItem(this._separator, 3);
    },

    _onControlStateChanged() {
        this.parent();

        if (this._control.get_state() != Gvc.MixerControlState.READY) {
            return;
        }

        let streams = this._control.get_streams();
        for (let stream of streams) {
            this._addStream(this._control, stream);
        }
    },

    _readOutput() {
        this.parent();

        if (!this._output.stream) {
            // safety check for failed setups
            return;
        }

        for (let id in this._outputs) {
            this._outputs[id].setSelected(this._output.stream.id == id);
        }
    },

    _addStream(control, stream) {
        if (stream.id in this._items
                || stream.id in this._outputs
                || stream.id in this._inputs
                || stream.is_event_stream
                || (stream.is_virtual && !this.options.virtualStreams)
                || (stream instanceof Gvc.MixerEventRole
                        && !this.options.systemSounds)) {
            return;
        }

        let options = {
            mixer: this._mixer,
            detailed: this.options.detailed,
            symbolicIcons: this.options.symbolicIcons,
            stream: stream
        };

        // system sounds
        if (stream instanceof Gvc.MixerEventRole) {
            let slider = new Volume.EventsSlider(control, options);

            this._items[stream.id] = slider;
            this.addMenuItem(slider.item, 1);

        // input stream (add to multi-input menu)
        } else if (stream instanceof Gvc.MixerSinkInput) {
            this._addInputStream(stream, control, options);

        // output stream (add to master-menu)
        } else if (stream instanceof Gvc.MixerSink) {
            this._addOutputStream(stream, control, options);
        }
    },

    _addInputStream(stream, control, options) {
        let slider = new Volume.InputSlider(control, options);

        this._inputs[stream.id] = slider;
        this._inputMenu.addSlider(slider);
    },

    _addOutputStream(stream, control, options) {
        let slider = new Volume.OutputSlider(control, options);

        let isSelected = this._output.stream
                && this._output.stream.id == stream.id;
        slider.setSelected(isSelected);

        this._outputs[stream.id] = slider;
        this._output.addSliderItem(slider.item);
    },


    _streamAdded(control, id) {
        let stream = control.lookup_stream_id(id);
        this._addStream(control, stream);
    },

    _streamRemoved(control, id) {
        if (id in this._items) {
            this._items[id].item.destroy();
            delete this._items[id];

        } else if (id in this._outputs) {
            this._outputs[id].item.destroy();
            delete this._outputs[id];

        } else if (id in this._inputs) {
            this._inputs[id].item.destroy();
            delete this._inputs[id];
            this._inputMenu.refresh();
        }
    },

    _streamChanged(control, id) {
        if (id in this._items) {
            this._items[id].refresh();

        } else if (id in this._outputs) {
            this._outputs[id].refresh();

        } else if (id in this._inputs) {
            this._inputs[id].refresh();
        }
    }
});
