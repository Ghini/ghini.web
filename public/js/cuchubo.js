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

// properties of 'listOf' are accessions, species, genera, familiae, and
// their values are the list of the matching markers.
var listOf = {};

// properties of 'taxonOf' are accessions and the associated value is
// the list of taxa at rank family, genus, species.
var taxonOf = {};

// the normal and highlighting icons...
var icon;

// all markers!!!
var markers = [];
// highlighted markers!
markers.highlighted = [];

// the layers we show. it's indexed by name and by zoom level. every object
// goes on a layer, and only the gardens-1 layer is kept alive during the
// whole session. other layers are dynamic, created if needed when entering
// a garden, destroyed when leaving a garden.
var objects_layer = {};
var objects_container = {};

//
// GLOBAL FUNCTIONS

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

function doHighlight() {
    var whatToHighlight = $("input[name=taxon]:checked").val();
    console.log(whatToHighlight);
    console.log(listOf[whatToHighlight]);
    for (var i = 0; i<listOf[whatToHighlight].length; i++) {
        var marker = listOf[whatToHighlight][i];
        console.log(marker);
        marker.setIcon(icon.black);
        markers.highlighted.push(marker);
    }
}

var lastEvent;
function fireAddPlant(e) {
    lastEvent = e;
    $('#addendum').val("2014.0");
    $('#addPlantModal').modal('show');
    return false;
}

function doAddPlant() {
    var threshold = map.getZoom();
    var layer = objects_layer['plants'][threshold];
    if (layer === null)
        return;
    if ($('#addendum').val() === "")
        return;

    var item= {};
    var plantParts = $('#addendum').val().split(".");
    plantParts.push("1");
    item.plant_short = "{2}".formatU(plantParts);
    item.plant = "{0}.{1}.{2}".formatU(plantParts);
    item.accession = "{0}.{1}".formatU(plantParts);
    item.lat = lastEvent.latlng.lat;
    item.lng = lastEvent.latlng.lng;
    item.zoom = threshold;
    item.family = item.genus = item.species = item.vernacular = "";

    finalAddObject(item);
    socket.emit("add-object", item);

    addToDom(item.plant, threshold, [item.lat, item.lng]);
}

var models = {};

models['gardens'] = {
    'text': '<b>{name}</b><br/>contact: {contact}<br/>mapped plants: {count}<br/>' +
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
    'text': '<b>{code}</b><br/>{vernacular}<br/>{species} ({family})<br/>',
    'update_menu': function (item) {}};

models['photos'] = {
    'text': '<b>{title}</b><br/>{name}<br/>' +
        '<a href="/img/photos/{name}" target="photo"><img width="192" src="/img/photos/thumbs/{name}"/></a>',
    'update_menu': function (item) {}};

models['infopanels'] = {
    'text': '<b>{title}</b><br/>{text}<br/>',
    'update_menu': function (item) {}};

models['__taxa'] = {
    'update_menu': function (item) {}};

function fireSelectGarden(e) {
    map.closePopup();
    socket.emit('select-garden', e);
    return false;
}

function set_alternative(selector, lead, trail) {
    $(selector).removeClass(function (index, css) {
        return (css.split(' ').filter(function(x) { return x.startsWith(lead); }).join(' '));
    });
    $(selector).addClass(lead + '-' + trail);
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

    var marker_id = generate_guid();
    var marker = L.marker([item.lat, item.lon],
                          item);
    markers.push(marker);
    marker.addTo(l).bindPopup(models[g].text.formatU(item),
                              {marker: marker});
    marker.on('mouseover',
              function() {
                  marker._icon.id = marker_id;
                  set_alternative('#' + marker_id, 'awesome-marker-icon', 'orange');
              });
    marker.on('mouseout',
              function() {
                  set_alternative('#' + marker_id, 'awesome-marker-icon', item.color);
              });

    if(item.lon > 100) {
        item.lon -= 360;
        marker = L.marker([item.lat, item.lon],
                          item);
        markers.push(marker);
        item.lon += 360;
        marker.addTo(l).bindPopup(models[g].text.formatU(item),
                                  {marker: marker});
    }
    if(item.lon < -100) {
        item.lon += 360;
        marker = L.marker([item.lat, item.lon],
                          item);
        markers.push(marker);
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

// add info about named plant to DOM (so we can easily copy it)
function addToDom(name, threshold, location) {
    // is it already there? (id contains dots, so we select carefully)
    var paragraph = $(document.getElementById(name));
    if (paragraph.length === 0) {
        paragraph = $('<p/>', { id: name });
        $('#accessions').append(paragraph);
    }
    paragraph.html(name + "," + threshold + "," + location);
}

function onDragend(event) {
    var marker = event.target;
    var data = { accession: marker.options.accession,
                 plant: marker.options.plant,
                 lat: marker.getLatLng().lat,
                 lng: marker.getLatLng().lng
               };
    data.plant_short = data.plant.split(".")[2];
    socket.emit('move', data);
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

Object.values = function(obj) {
    return Object.keys(obj).map(function(key) {return obj[key];});
};

function zoomToSelection(g, markers) {
    for(var layername in objects_layer) {
        if(layername === g)
            continue;
        finalRemoveLayer(layername);
    }
    console.log(markers);
    var selection = Object.values(objects_container[g])
        .filter(function(x) {return markers.includes(x.name);});
    console.log(selection);
    map.fitBounds(selection.map(function(x) { return [x.lat, x.lon]; }));
}

function markers_setcolor(markers, options) {
    for(var item in markers) {
        set_alternative("div.awesome-marker[title='" + markers[item] + "']",
                       'awesome-marker-icon', options.color);
    }
}

// MIT-licensed code by Benjamin Becquet
// https://github.com/bbecquet/Leaflet.PolylineDecorator
L.RotatedMarker = L.Marker.extend({
    options: { angle: 0 },
    _setPos: function(pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
            // use the CSS transform rule if available
            this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'deg)';
        } else if (L.Browser.ie) {
            // fallback for IE6, IE7, IE8
            var rad = this.options.angle * L.LatLng.DEG_TO_RAD,
            costheta = Math.cos(rad),
            sintheta = Math.sin(rad);
            this._icon.style.filter += ' progid:DXImageTransform.Microsoft.Matrix(sizingMethod=\'auto expand\', M11=' +
                costheta + ', M12=' + (-sintheta) + ', M21=' + sintheta + ', M22=' + costheta + ')';
        }
    }
});

L.rotatedMarker = function(pos, options) {
    return new L.RotatedMarker(pos, options);
};
// MIT-licensed code - end

// read a file from the server (asynchronously)
function getFileFromServer(url, doneCallback) {
    var xhr;

    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = handleStateChange;
    xhr.open("GET", url, true);
    xhr.send();

    function handleStateChange() {
        if (xhr.readyState === 4) {
            doneCallback(xhr.status == 200 ? xhr.responseText : null);
        }
    }
}

// set by zoomstart, examined by zoomend.
var previous_zoom = 0;

function onZoomstart() {
    // remember the previous zoom, so you know whether you're zooming
    // in, or out.
    previous_zoom = map.getZoom();
}

function onZoomend() {
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

String.prototype.formatU = function() {
    var str = this.toString();
    if (!arguments.length)
        return str;
    var args = typeof arguments[0];
    args = (("string" == args || "number" == args) ? arguments : arguments[0]);
    for (var arg in args)
        str = str.replace(RegExp("\\{" + arg + "\\}", "gi"), args[arg]);
    return str;
};


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
    var status = 0;
    L.easyButton('icon-search', function(){
        if(status === 0) {
            $('#map').css('width', '80%');
            status = 1;
        } else {
            $('#map').css('width', '100%');
            status = 0;
        }
    }).setPosition('topright').addTo(map);

    // add our own control, for managing the search tool
    //L.control.watermark({ position: 'topright' }).addTo(map);

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


    // associate callbacks to events
    //map.on('contextmenu', fireAddPlant);
    map.on('zoomend', onZoomend);
    map.on('zoomstart', onZoomstart);
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

    // REACT ON MESSAGES ON THE COMMUNICATION SOCKET
    socket.on('move', function(data) {
        listOf[data.plant].setLatLng([data.lat, data.lng]);
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
        map.setView([doc.lat, doc.lon], doc.zoom);
        for (var g in objects_layer) {
            for(var z in objects_layer[g]) {
                if(z <= doc.zoom) {
                    map.addLayer(objects_layer[g][z]);
                } else {
                    map.removeLayer(objects_layer[g][z]);
                }
            }
        }
    });
    socket.on('map-remove-objects', finalRemoveLayer);
    socket.emit('select-garden', '');
}


/*

icons we could use
user
trash
home
flag
tag
camera
info-sign
leaf
comment
globe

*/
