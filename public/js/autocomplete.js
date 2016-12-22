var shorten = function(x) {
    return x.toLowerCase().replace(/-/, '').replace(/ph/g, 'f')
        .replace(/h/g, '').replace(/[cq]/g, 'k').replace(/z/g, 's')
        .replace(/ae/g, 'e').replace(/[ye]/g, 'i').replace(/u/g, 'o')
        .replace(/(.)\1/g, '$1');
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

function markers_setcolor(markers, options) {
    for(var item in markers) {
        set_alternative("div.awesome-marker[title='" + markers[item] + "']",
                       'awesome-marker-icon', options.color);
    }
}

function toggle_collapse_table_section(tr_elem) {
    var display;
    if(/ghini-collapsed-true/.test(tr_elem.className)) {
        set_alternative(tr_elem, 'ghini-collapsed', 'false');
        display = 'table-row';
    } else {
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
    if(active_garden === '') {
        marker_names = item.gardens.map(function(x){return x.name;});
    } else {
        marker_names = [active_garden];
        if(false)
            return [];
    }
    if(active_garden === '') {
        var row = $('<tr/>', {class: 'match_item'})
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
                set_alternative(x.currentTarget, 'ghini-highlighted', 'true');
                markers_setcolor(marker_names, {color: 'orange'}); } )
            .mouseleave(function(x) {
                set_alternative(x.currentTarget, 'ghini-highlighted', 'false');
                markers_setcolor(marker_names, {color: 'green'}); } )
            .contextmenu(function(x) { toggle_collapse_table_section(x.currentTarget); return false; });
        row.append($('<td/>', {class: 'binomial', text: item.species_name}));
        row.append($('<td/>', {class: 'family', text: item.taxon.family}));
        result.push(row);
        for(i in active_garden_plants) {
            row = $('<tr/>', {class: 'garden-row', plant_id: active_garden_plants[i]._id})
                .dblclick(function(x) {
                    center_plant(x.currentTarget);
                    window.getSelection().removeAllRanges();
                    return false; } )
                .mouseenter(function(x) {
                    set_alternative(x.currentTarget, 'ghini-highlighted', 'true');
                    markers_setcolor([x.currentTarget.children[0].textContent], {color: 'orange'}); } )
                .mouseleave(function(x) {
                    set_alternative(x.currentTarget, 'ghini-highlighted', 'false');
                    markers_setcolor([x.currentTarget.children[0].textContent], {color: 'green'}); } );
            row.append($('<td/>', {class: 'garden-name', text: active_garden_plants[i].code}));
            result.push(row);
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

function zip(arrays) {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array) { return array[i]; } );
    });
}      
