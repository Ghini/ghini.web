// This file is part of ghini.web
// http://github.com/Ghini/ghini.web

// ghini.web is free software: you can redistribute ghini.web and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 2 of the License, or (at
// your option) any later version.
//
// ghini.web is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public
// License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with ghini.web.  If not, see <http://www.gnu.org/licenses/>.


//
// GLOBAL VARIABLES
var map = null;

var socket;

// properties of 'taxonOf' are accessions and the associated value is
// the list of taxa at rank family, genus, species.
var taxonOf = {};

// the normal and highlighting icons...
var icon;

// all markers!!!
var markers = {};
// highlighted markers!
markers.highlighted = [];

// the layers we show. it's indexed by name and by zoom level. every object
// goes on a layer, and only the gardens-1 layer is kept alive during the
// whole session. other layers are dynamic, created if needed when entering
// a garden, destroyed when leaving a garden.
var objects_layer = {};
var objects_container = {};

// the garden we're zooming into
var active_garden = '';

//
// GLOBAL FUNCTIONS

Object.values = function(obj) {
    // Object.values({key: 'value'}) => ['value']
    return Object.keys(obj).map(function(key) {return obj[key];});
};

String.prototype.formatU = function() {
    // "abc.{0}-{1}".formatU([5, 6]) => abc.5-6
    // "abc.{key}-{key}".formatU({key: 5}) => abc.5-5
    var str = this.toString();
    if (!arguments.length)
        return str;
    var args = typeof arguments[0];
    args = (("string" == args || "number" == args) ? arguments : arguments[0]);
    for (var arg in args) {
        var value = args[arg];
        if (typeof(value) === 'number') {
            value = value.toFixed(6).replace(/\.?0*$/, '');
        }
        str = str.replace(RegExp("\\{" + arg + "\\}", "gi"), value);
    }
    return str;
};

function generate_guid(mongo_id) {
    if(mongo_id === undefined) {
        var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    } else {
        return mongo_id;
    }
}

function zip(arrays) {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array) { return array[i]; } );
    });
}

function set_alternative(selector, lead, trail) {
    $(selector).removeClass(function (index, css) {
        return (css.split(' ').filter(function(x) { return x.startsWith(lead); }).join(' '));
    });
    $(selector).addClass(lead + '-' + trail);
}

function shorten(x) {
    return x.toLowerCase().replace(/-/, '').replace(/ph/g, 'f')
        .replace(/h/g, '').replace(/[cq]/g, 'k').replace(/z/g, 's')
        .replace(/ae/g, 'e').replace(/[ye]/g, 'i').replace(/u/g, 'o')
        .replace(/(.)\1/g, '$1');
};

function markers_setcolor(markers, options) {
    for(var item in markers) {
        set_alternative("div.awesome-marker[title='" + markers[item] + "']",
                       'awesome-marker-icon', options.color);
    }
}

function openHighlightModal(e) {
    $('#highlightModal').modal('show');
    map.closePopup();
    computeHighlightOptions(e.target.options.accession);
}

function fireHighlightModal() {
    resetHighlightOptions();
    if(map._popup) {
        var accession = map._popup.options.marker.options.accession;
        $('#keyword').val(accession);
    }
    computeHighlightOptions($("#keyword").val());
    $('#highlightModal').modal('show');
    return false;
}

function showPhotoModal(picture_name) {
    $('#showPhotoModal h3').html($(this).attr('title-text'));
    $('#showPhotoModal img').attr('src', '/img/photos/' + picture_name);
    $('#showPhotoModal').modal('show');
}

function resetHighlightOptions() {
    $("#highlightOptions").empty();
    while(markers.highlighted.length)
        markers.highlighted.pop().setIcon(icon.gray);
}

function computeHighlightOptions(name) {
    $("#keyword").val(name);
    resetHighlightOptions();
    if(name === "") {
        return;
    }
    var div = $('#highlightOptions');

    function addRadioButton(taxon, text) {
        var label = $('<label/>');
        div.append(label);
        var elem = $('<input/>',
                     { type: 'radio',
                       name: 'taxon',
                       value: taxon
                     });
        label.append(elem);
        label.append(" " + text);
    }

    if (name in taxonOf) {
        addRadioButton(taxonOf[name].family, taxonOf[name].family);
        addRadioButton(taxonOf[name].genus, taxonOf[name].genus);
        addRadioButton(taxonOf[name].genus + " " + taxonOf[name].species, taxonOf[name].species);
        addRadioButton(name, name);
    }
}

var models = {};

models['gardens'] = {
    'text': '<b>{name}</b><br/>contact: {contact}<br/>mapped plants: {plants}<br/>mapped photos: {photos}<br/>mapped panels: {infopanels}<br/>' +
        '<a onclick="fireSelectGarden(\'{name}\'); return false;", href="#">zoom to garden</a><br/>',
    'update_menu': function(item) {
        var list_item = $('<li/>', { id: 'gardens-menu-item-{lat}-{lon}'.formatU(item) });
        $('#gardens-menu-list').append(list_item);
        var anchor = $('<a/>',
                       { href: '#',
                         onclick: "fireSelectGarden('" + item.title + "'); return false;"
                       });
        list_item.append(anchor);
        var icon_element = $('<i/>', { class: 'icon-map-marker icon-black' });
        anchor.append(icon_element);
        anchor.append(" " + item.title);
    }};

models['plants'] = {
    'text': '<b>{code}</b><br/>{vernacular}<br/>{species} ({family})<br/>' +
        '<div onclick="$(\'div.tab-content > div.active > input\')[0].value = \'{species}\'; $(\'div.tab-content > div.active > input\').keyup(); return false;">search species</div>',
    'update_menu': function (item) {}};

models['photos'] = {
    'text': '<b>{title}</b><br/>{name}<br/>' +
        '<a href="/img/photos/{name}" target="photo"><img width="192" src="/img/photos/thumbs/{name}"/></a>',
//        '<a href="#" onclick="showPhotoModal(\'{name}\'); return false;"><img width="192" src="/img/photos/thumbs/{name}"/></a>',
    'update_menu': function (item) {}};

models['infopanels'] = {
    'text': '<b>{title}</b><br/>{text}<br/>',
    'update_menu': function (item) {}};

models['__taxa'] = {
    'update_menu': function (item) {}};

function fireSelectGarden(e) {
    map.closePopup();
    socket.emit('select-garden', {'garden': e});
    active_garden = e;
    if(active_garden === ''){
        $('li#search-by-accession-tab').css('display', 'none');
        $('li#search-by-tag-tab').css('display', 'none');
    }else{
        $('li#search-by-accession-tab').css('display', 'block');
        $('li#search-by-tag-tab').css('display', 'block');
    }
    $('div.tab-content > div.active > input').keyup();
    return false;
}

function finalAddObject(item) {
    var g = item.layer_name;
    if(typeof objects_container[g] === 'undefined')
        objects_container[g] = {};
    if(g.startsWith('__')) {
        objects_container[g][item._id] = item;
        return;
    } else {
        if(typeof objects_container[g][item._id] !== 'undefined') {
            return;
        }
        objects_container[g][item._id] = item;
    }

    if ('icon' in item && 'color' in item) {
        var icon = L.AwesomeMarkers.icon({ color: item.color,
                                           icon: item.icon });
        item.icon = icon;
    }

    var z = item.layer_zoom;
    var l;

    var list_item, anchor, icon_element;

    models[g].update_menu(item);
    if (typeof objects_layer[g] === 'undefined' || Object.keys(objects_layer[g]).length === 0) {
        console.log('not found layers', g, "... creating now");
        objects_layer[g] = {};
        objects_layer[g].visible = true;

        list_item = $('<li/>', { id: 'toggle-menu-item-' + g });
        $('#toggle-menu-list').append(list_item);
        anchor = $('<a/>',
                       { href: '#',
                         onclick: 'toggleLayerCheck(this, "' + g + '"); return false;'
                       });
        list_item.append(anchor);
        icon_element = $('<i/>', { class: 'icon-ok icon-black' });
        anchor.append(icon_element);
        anchor.append(" " + g);
    }
    if (!objects_layer[g][z]) {
        objects_layer[g][z] = L.layerGroup();
        l = objects_layer[g][z];
        if(z <= map.getZoom()) {
            map.addLayer(l);
        }
    }
    l = objects_layer[g][z];

    var marker = L.marker([item.lat, item.lon],
                          item);
    marker.addTo(l).bindPopup(models[g].text.formatU(item),
                              {marker: marker});
    var marker_id = generate_guid(item._id);

    markers[item._id] = marker;
    marker.on('mouseover',
              function() {
                  if($('i.ghini-magnet.icon-pushpin').length !== 0)
                      return;
                  marker._icon.id = marker_id;
                  set_alternative('#' + marker_id, 'awesome-marker-icon', 'orange');
              });
    marker.on('mouseout',
              function() {
                  if($('i.ghini-magnet.icon-pushpin').length !== 0)
                      return;
                  set_alternative('#' + marker_id, 'awesome-marker-icon', item.color);
              });

    if(item.lon > 100) {
        item.lon -= 360;
        marker = L.marker([item.lat, item.lon],
                          item);
        item.lon += 360;
        marker.addTo(l).bindPopup(models[g].text.formatU(item),
                                  {marker: marker});
    }
    if(item.lon < -100) {
        item.lon += 360;
        marker = L.marker([item.lat, item.lon],
                          item);
        item.lon -= 360;
        marker.addTo(l).bindPopup(models[g].text.formatU(item),
                                  {marker: marker});
    }
}

function finalRemoveLayer(layer_name) {
    var g = layer_name;
    for (var z in objects_layer[g]) {
        if(isNaN(z))
            continue;
        map.removeLayer(objects_layer[g][z]);
    }
    $('#toggle-menu-item-' + g).remove();
    objects_layer[g] = {};
    objects_container[g] = {};
}

function toggleLayerCheck(anchor, layerName) {
    var removing = objects_layer[layerName].visible;
    objects_layer[layerName].visible = !removing;
    for(var z in objects_layer[layerName]) {
        if(isNaN(z))
            continue;
        var layer = objects_layer[layerName][z];
        if(removing) {
            map.removeLayer(layer);
        } else {
            if(z <= map.getZoom())
                map.addLayer(layer);
        }
    }
    var check = anchor.childNodes[0];
    if(removing) {
        check.className = "icon-remove icon-black";
    } else {
        check.className = "icon-ok icon-black";
    }
}

function zoomToSelection(g, markers) {
    for(var layername in objects_layer) {
        if(layername === g)
            continue;
        finalRemoveLayer(layername);
    }
    var selection = Object.values(objects_container[g])
        .filter(function(x) {return markers.includes(x.name);});
    map.fitBounds(selection.map(function(x) { return [x.lat, x.lon]; }));
}

function updateLocationHash() {
    var centre = map.getCenter();
    var tail = '';
    centre.zoom = map.getZoom();
    if (active_garden !== '') {
        tail = ';garden=' + active_garden;
    }
    window.location.hash = '#map={zoom}/{lat}/{lng}'.formatU(centre) + tail;
}

// set by zoomstart, examined by zoomend.
var previous_zoom = 0;

function onZoomStart() {
    // remember the previous zoom, so you know whether you're zooming
    // in, or out.
    previous_zoom = map.getZoom();
}

function onMoveEnd() {
    updateLocationHash();
}

function onZoomEnd() {
    updateLocationHash();
    var l = {};
    for(var g in objects_layer) {
        if (previous_zoom > map.getZoom()) {
            // we are either zooming out ...
            l = objects_layer[g][previous_zoom];
            if (typeof l !== 'undefined')
                map.removeLayer(l);
        } else {
            // or zooming in !!!
            l = objects_layer[g][map.getZoom()];
            if (typeof l !== 'undefined' && objects_layer[g].visible)
                map.addLayer(l);
        }
    }
}

function toggle_collapse_table_section(event) {
    var tr_elem = event.currentTarget.parentElement.parentElement;
    var i_elem = event.currentTarget;
    var display;
    if(/ghini-collapsed-true/.test(tr_elem.className)) {
        set_alternative(i_elem, 'icon', 'chevron-down');
        set_alternative(tr_elem, 'ghini-collapsed', 'false');
        display = 'table-row';
    } else {
        set_alternative(i_elem, 'icon', 'plus');
        set_alternative(tr_elem, 'ghini-collapsed', 'true');
        display = 'none';
    }
    for(var a=tr_elem.nextSibling; a !== null && /garden-row/.test(a.className); a = a.nextSibling) {
        $(a).css('display', display);
    }
    return false;
}

function present_item(item) {
    var result = [];
    var marker_names;
    var row, td;
    if(active_garden === '') {
        marker_names = item.gardens.map(function(x){return x.name;});
    } else {
        marker_names = [active_garden];
        if(false)
            return [];
    }
    if(active_garden === '') {
        row = $('<tr/>', {class: 'match_item'})
            .dblclick(function(x) {
                zoomToSelection('gardens', marker_names);
                window.getSelection().removeAllRanges();
                return false; } )
            .mouseenter(function(x) {
                set_alternative(x.currentTarget, 'ghini-highlighted', 'true');
                markers_setcolor(marker_names, {color: 'orange'}); } )
            .mouseleave(function(x) {
                set_alternative(x.currentTarget, 'ghini-highlighted', 'false');
                markers_setcolor(marker_names, {color: 'red'}); } );
        row.append($('<td/>', {class: 'binomial', text: item.species_name}));
        row.append($('<td/>', {class: 'family', text: item.taxon.family}));
        result.push(row);
        for(var i in item.gardens) {
            row = $('<tr/>', {class: 'garden-row'})
                .dblclick(function(x) {
                    fireSelectGarden(x.currentTarget.children[0].textContent);
                    window.getSelection().removeAllRanges();
                    return false; } )
                .mouseenter(function(x) {
                    set_alternative(x.currentTarget, 'ghini-highlighted', 'true');
                    markers_setcolor([x.currentTarget.children[0].textContent], {color: 'orange'}); } )
                .mouseleave(function(x) {
                    set_alternative(x.currentTarget, 'ghini-highlighted', 'false');
                    markers_setcolor([x.currentTarget.children[0].textContent], {color: 'red'}); } );
            row.append($('<td/>', {class: 'garden-name', text: item.gardens[i].name}));
            row.append($('<td/>', {class: 'plant-count', text: item.gardens[i].plant_count}));
            result.push(row);
        }
    } else {
        var active_garden_item = item.gardens.filter(function(x){return x.name === active_garden;});
        if(active_garden_item.length === 0)
            return [];
        var active_garden_plants = active_garden_item[0].plants;
        marker_names = active_garden_plants.map(function(x){return x.code;});
        row = $('<tr/>', {class: 'match_item'})
            .mouseenter(function(x) {
                if($('i.ghini-magnet.icon-pushpin.ghini-frozen').length !== 0)
                    return;
                set_alternative(x.currentTarget, 'ghini-highlighted', 'true');
                markers_setcolor(marker_names, {color: 'orange'}); } )
            .mouseleave(function(x) {
                if($('i.ghini-magnet.icon-pushpin.ghini-frozen').length !== 0)
                    return;
                set_alternative(x.currentTarget, 'ghini-highlighted', 'false');
                markers_setcolor(marker_names, {color: 'green'}); } )
            .click(function(x) {
                var magnet = $('tr.ghini-highlighted-true > td > i.ghini-magnet');
                magnet.toggleClass('ghini-frozen');
                if(magnet.hasClass('ghini-frozen')) {
                    set_alternative(magnet, 'icon', 'pushpin');
                } else {
                    set_alternative(magnet, 'icon', 'pushme');
                } });
        td = $('<td/>', {class: 'binomial'})
            .mouseenter(function(x) {
                if($('i.ghini-magnet.icon-pushpin').length === 0)
                    set_alternative(x.currentTarget.children[2], 'icon', 'pushme');
            })
            .mouseleave(function(x) {
                var magnet = x.currentTarget.children[2];
                if( !$(magnet).hasClass('ghini-frozen'))
                    set_alternative(magnet, 'icon', 'empty');
            });
        td.append($('<i/>', {class: 'icon-chevron-down', style: 'float: left;'})
                  .click(function(x) {
                      toggle_collapse_table_section(x);
                      return false;
                  }));
        td.append($('<div/>', {style: 'float: left; clear: both;', text: item.species_name}));
        td.append($('<i/>', {class: 'ghini-magnet icon-empty'}));
        row.append(td);
        row.append($('<td/>', {class: 'family', text: item.taxon.family}));
        result.push(row);
        for(i in active_garden_plants) {
            row = $('<tr/>', {class: 'garden-row', plant_id: active_garden_plants[i]._id})
                .dblclick(function(x) {
                    center_plant(x.currentTarget);
                    window.getSelection().removeAllRanges();
                    return false; } )
                .mouseenter(function(x) {
                    if($('i.ghini-magnet.icon-pushpin').length !== 0)
                        return;
                    set_alternative(x.currentTarget, 'ghini-highlighted', 'true');
                    markers_setcolor([x.currentTarget.children[0].textContent], {color: 'orange'}); } )
                .mouseleave(function(x) {
                    if($('i.ghini-magnet.icon-pushpin').length !== 0)
                        return;
                    set_alternative(x.currentTarget, 'ghini-highlighted', 'false');
                    markers_setcolor([x.currentTarget.children[0].textContent], {color: 'green'}); } );
            row.append($('<td/>', {class: 'garden-name', text: active_garden_plants[i].code}));
            result.push(row);
        }
    }
    return result;
}

function parse_hash(s) {
    var result = {};
    var tests = [
        function(s) {
            var test = /^(garden)=([-a-zA-Z \'\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*)$/;
            var match = test.exec(decodeURIComponent(s));
            if(match) {
                return [match[1], decodeURIComponent(match[2])];
            }
            return false;
        },
        function(s) {
            var test = /^(map)=([1-9][0-9]*)\/(-?[0-9]*(?:\.[0-9]*)?)\/(-?[0-9]*(?:\.[0-9]*)?)$/;
            var match = test.exec(s);
            if(match) {
                return [match[1], {zoom: Number(match[2]),
                                   lat: Number(match[3]),
                                   lon: Number(match[4])}];
            }
            return false;
        }];
    if (s.startsWith('#')) {
        var parts = s.slice(1).split(';');
        for(var hh in parts) {
            var hash_part = parts[hh];
            for(var i in tests) {
                var match = tests[i](hash_part);
                if(match) {
                    result[match[0]] = match[1];
                }
            }
        }
    }
    return result;
}

function center_plant(x) {
    var plant = objects_container['plants'][x.getAttribute('plant_id')];
    map.setView([plant.lat, plant.lon], Math.max(plant.layer_zoom, map.getZoom()));
}

function does_item_match(item, input, field_name) {
    input = input.replace(/-/g, '.*');
    var reg = new RegExp('^' + shorten(input), 'i');
    return item[field_name].match(reg);
}

function match_species(val) {
    // when inside of a garden, results are plants, when browsing globally,
    // results are gardens.
    var objs = Object.values(objects_container.__taxa);
    $('#result').empty();
    if(val.length > 2) {
        objs = objs.filter(function(x) { return does_item_match(x, val, 'phonetic');});
        var elements = objs.map(present_item);
        elements.map(function(x) {$('#result').append(x);});
    }
}

L.Control.SearchButton = L.Control.extend({
    onAdd: function (map) {
        var status = 0;
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        $(container).append($('<a/>').append($('<i/>').addClass('icon icon-search'))
                            .css('height', '30px').css('width', 'inherit'));

        container.style.backgroundColor = 'white';
        container.style.width = $('.leaflet-control-zoom-out').css('width');
        container.style.height = '32px';

        container.onclick = function(){
            if(status === 0) {
                $('#map').css('width', '80%');
                status = 1;
            } else {
                $('#map').css('width', '100%');
                status = 0;
            }
        };
        return container;
    },

    onRemove: function(map) {
        // Nothing to do here
    }
});

L.control.searchButton = function(opts) {
    return new L.Control.SearchButton(opts);
};

function mapSetView(lat, lon, zoom) {
    map.setView([lat, lon], zoom);
    updateLocationHash();
    for (var g in objects_layer) {
        for(var z in objects_layer[g]) {
            if(z <= zoom) {
                map.addLayer(objects_layer[g][z]);
            } else {
                map.removeLayer(objects_layer[g][z]);
            }
        }
    }
}

// to be called at document ready!
function init() {

    // ---------------------------
    // initialize global variables

    // open the communication socket!!!
    socket = io.connect(window.location.href);

    // create a map in the "map" div
    map = L.map('map', {zoomControl: false});
    icon = {
        'garden': L.AwesomeMarkers.icon({ color: '#ffffff',
                                          icon: 'info-sign' }),
        'gray': L.icon({
            iconUrl: './res/bullet-lightgray.png',
            iconSize:     [16, 16], // size of the icon
            iconAnchor:   [8, 8], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -4] // point from which the popup should open relative to the iconAnchor
        }),
        'black': L.icon({
            iconUrl: './res/bullet-black.png',
            iconSize:     [16, 16], // size of the icon
            iconAnchor:   [8, 8], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -4] // point from which the popup should open relative to the iconAnchor
        })
    };

    // add the scale control
    L.control.scale({ position: 'bottomleft' }).addTo(map);
    // add the zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);
    // add our own control, for managing the search tool
    L.control.searchButton({ position: 'topright' }).addTo(map);

    // some tiles servers:
    // -------------------------
    // 'http://{s}.tile.osm.org/{z}/{x}/{y}.png', // osm server (most frequently updated)
    // 'http://a.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', // black & white
    // 'http://otile1.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', // mapquest
    // 'http://cuchubo.wdfiles.com/local--files/tiles-{z}/{z}.{y}.{x}.png', // our tiles on wikidot
    // 'tiles-{z}/{z}.{y}.{x}.png', // local tiles on rune
    // -------------------------

    // create an OpenStreetMap tile layer
    L.tileLayer(
        '/tiles-{z}/{z}.{x}.{y}.png', // our tiles on the local nodejs server
        { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          minZoom: 1,
          maxZoom: 3
        }).addTo(map);

    L.tileLayer(
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png', // osm server (most frequently updated)
        { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          minZoom: 4,
          maxZoom: 19
        }).addTo(map);
    L.tileLayer(
        '/tiles-{z}/{z}.{x}.{y}.png', // our tiles on the local nodejs server
        { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          minZoom: 20,
          maxZoom: 22
        }).addTo(map);

    // handling the hash tail in the URL, initially and changes to it.
    var hash_parts = {};
    if(window.location.hash) {
        hash_parts = parse_hash(window.location.hash);
        console.log(hash_parts);
    }
    window.onhashchange = function() {
        // doYourStuff();
    };

    // associate callbacks to events
    map.on('moveend', onMoveEnd);
    map.on('zoomend', onZoomEnd);
    map.on('zoomstart', onZoomStart);
    $("#keyword").val("");
    $("#keyword").on('change', function(e){computeHighlightOptions($("#keyword").val());});
    $("#addendum").on('change', function(e) {return false;});

    map.on('popupopen', function(e) {
        map._popup.options.minWidth = $('div.leaflet-popup-content img').width() + 10;
        map._popup.update();
        $('div.leaflet-popup-content img').onload = function() {
            map._popup.options.minWidth = $('div.leaflet-popup-content img').width() + 10;
            map._popup.update();
        };
        $('div.leaflet-popup-content a.thumbnail').click(function (e) {
            $('#showPhotoModal h3').html($(this).attr('title-text'));
            $('#showPhotoModal img').attr('src', $(this).attr('data-img-url'));
            $('#showPhotoModal').modal('show');
        });
        return false;
    });

    // initialize the help menu
    socket.on('init-help', function (data) {
        for(var i=0; i<data.length; i++){
            var item = data[i];
            var div = $("<div/>", { id: item.name + "Modal",
                                    class: "modal hide fade",
                                    style: "display: none;"
                                  });

            $(document.body).append(div);
            var header_div = $('<div/>', { class: 'modal-header' });
            var body_div = $('<div/>', { class: 'modal-body' });
            div.append(header_div).append(body_div);

            header_div.append($('<a/>', { class: 'close', 'data-dismiss': 'modal'}).text("×"));
            header_div.append($('<h3/>').text(item.title));

            // add the reference to the dialog box to the help menu.
            var list_item = $('<li/>');
            console.log(item.name);
            var anchor = $('<a/>', { onclick: "$('#" + item.name + "Modal').modal('show'); return false;", href: "#" });
            var icon = $('<i/>', { class: "icon-" + item.icon + " icon-black" });
            $("#help-menu-list").append(list_item);
            list_item.append(anchor);
            anchor.append(icon);
            anchor.append(" ");
            anchor.append(item.anchor);
            body_div.html(item.content);
        }
    });

    socket.on('add-object', finalAddObject);
    socket.on('map-set-view', function(doc) {
        if('name' in doc) {
            active_garden = doc.name;
        }
        mapSetView(doc.lat, doc.lon, doc.zoom);
    });
    socket.on('map-remove-objects', finalRemoveLayer);
    socket.emit('select-garden', hash_parts);
}
