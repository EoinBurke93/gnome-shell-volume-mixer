/**
 * Shell Volume Mixer
 *
 * Menu items.
 *
 * @author Alexander Hofbauer <alex@derhofbauer.at>
 */

/* exported MasterMenuItem, SubMenuItem */

const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Lib = imports.misc.extensionUtils.getCurrentExtension().imports.lib;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

const Slider = Lib.widget.slider;


let makeItemLine = function(ornament) {
    let line = new St.BoxLayout({ style_class: 'popup-menu-item svm-container-line' });

    if (ornament === undefined) {
        ornament = new St.Label({ style_class: 'popup-menu-ornament' });
    }

    if (ornament) {
        line.add(ornament);
    }

    return line;
};

let prepareMenuItem = function(instance) {
    instance.actor.get_children().map(function (child) {
        instance.actor.remove_actor(child);
    });

    instance.container = new St.BoxLayout({ vertical: true, style_class: 'svm-menu-item-container' });
    instance.actor.add(instance.container, { expand: true });

    if (!instance.firstLine) {
        instance.firstLine = makeItemLine(instance._ornamentLabel);
        instance.container.add(instance.firstLine, { expand: true });
    }

    if (!instance.secondLine) {
        instance.secondLine = makeItemLine();
        instance.container.add(instance.secondLine, { expand: true });
    }

    instance.firstLine.add_style_class_name('line-1');
    instance.secondLine.add_style_class_name('line-2');
};


/**
 * Submenu item for the sink selection menu.
 */
var MasterMenuItem = new Lang.Class({
    Name: 'MasterMenuItem',
    Extends: PopupMenu.PopupSubMenuMenuItem,

    _init(sliderVolumeStep) {
        this.parent('', true);
        prepareMenuItem(this);

        this._slider = new Slider.VolumeSlider(0, sliderVolumeStep);

        this.firstLine.add_child(this.icon);
        this.firstLine.add(this.label, { expand: true });
        this.firstLine.add_child(this._triangleBin);

        this.secondLine.add(this._slider.actor, { expand: true });
        this.secondLine.add_style_class_name('svm-master-slider-line');

        this.label.add_style_class_name('svm-master-label');
        this.actor.add_style_class_name('svm-master-slider svm-menu-item');
    },

    _onButtonReleaseEvent(actor, event) {
        if (event.get_button() == 2) {
            return Clutter.EVENT_STOP;
        }
        return this.parent(actor, event);
    },

    /**
     * Change volume on left / right.
     */
    _onKeyPressEvent(actor, event) {
        let symbol = event.get_key_symbol();

        if (symbol == Clutter.KEY_Right || symbol == Clutter.KEY_Left) {
            return this._slider.onKeyPressEvent(actor, event);
        }

        return this.parent(actor, event);
    }
});


/**
 * Sub menu item implementation for dropdown menus (via master slider menu or input menu).
 */
var SubMenuItem = new Lang.Class({
    Name: 'OutputStreamSlider',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init(params) {
        this.parent(params);
        prepareMenuItem(this);
    },

    addChildAt(child, pos) {
        let line = makeItemLine();

        line.add_child(child);
        this.container.insert_child_at_index(line, pos);

        return line;
    },

    setSelected(selected) {
        this.setOrnament(selected === true ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
    }
});
