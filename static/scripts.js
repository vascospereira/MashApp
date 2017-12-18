// Google Map
let map;
// markers for map
const markers = [];
// info window
const info = new google.maps.InfoWindow();

(function () {
    'use strict';
    // styles for map
    // https://developers.google.com/maps/documentation/javascript/styling
    const styles = [
        {
            featureType: "all",
            elementType: "labels",
            stylers: [{visibility: "off"}]
        },
        {
            elementType: 'geometry',
            stylers: [{color: '#242f3e'}]
        },
        {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{color: '#38414e'}]
        },
        {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{color: '#212a37'}]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{color: '#746855'}]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{color: '#1f2835'}]
        },
        {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{color: '#17263c'}]
        }
    ];

    // options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    const options = {
        center: {lat: 39.2290, lng: -106.876}, // Aspen, Colorado
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    };

    // get DOM node in which map will be instantiated
    const canvas = document.getElementById("map-canvas");
    // instantiate map
    map = new google.maps.Map(canvas, options);
    // configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);

})();

/**
 * Adds marker for place to map.
 */
function addMarker(place) {
    const myLatLng = new google.maps.LatLng(place.latitude, place.longitude);
    // const image = "http://maps.google.com/mapfiles/kml/pal2/icon31.png";
    const image = "/static/nsp.png";
    const marker = new google.maps.Marker({
        map: map,
        animation: google.maps.Animation.DROP,
        position: myLatLng,
        icon: {
            url: image,
            labelOrigin: new google.maps.Point(12, -12)
        },
        label: {
            text: `${place.place_name}, ${place.admin_name1}`,
            fontWeight: 'bold',
            fontSize: '12px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#E7E7E7'
        }
    });

    // listen clicks on marker
    google.maps.event.addListener(marker, 'click', function () {
        //show ajax indicator
        showInfo(marker);
        // get articles for place - asynchronously
        axios.get(`/articles?geo=${place.postal_code}`)
            .then(response => {
                if (!response.data) {
                    showInfo(marker, "No News For Today.");
                } else {
                    /* build unordered list of links to articles with Handlebars*/
                    let ul = "<ul>";
                    const template = Handlebars.compile("<li><a href='{{link}}' target='_blank'>{{title}}</a></li>");
                    for (let i = 0, n = response.data.length; i < n; i++) {
                        ul += template({link: response.data[i].link, title: response.data[i].title});
                    }
                    ul += "</ul>";
                    showInfo(marker, ul);
                }
            })
            .catch(error => console.log(error.toString()));
    });
    // remember marker to be removed later
    markers.push(marker);
}

/**
 * Configures application.
 */
function configure() {
    // update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function () {
        // if info window isn't open
        // http://stackoverflow.com/a/12410385
        if (!info.getMap || !info.getMap()) {
            update();
        }
    });
    // update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function () {
        update();
    });
    // type ahead configuration
    $("#q").typeahead({
            highlight: false,
            minLength: 1
        },
        {
            display: function (suggestion) {
                return null;
            },
            limit: 10,
            source: search,
            templates: {
                suggestion: Handlebars.compile(
                    "<div>" + "{{place_name}}, {{#if admin_name1}}{{admin_name1}},{{/if}} {{postal_code}}" + "</div>"
                )
            }
        });
    // re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function (eventObject, suggestion, name) {
        // set map's center
        map.setCenter({lat: parseFloat(suggestion.latitude), lng: parseFloat(suggestion.longitude)});
        // update UI
        update();
    });

    // hide info window when text box has focus
    document.getElementById("q").focus(() => info.close());
    // re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function (event) {
        event.returnValue = true;
        event.stopPropagation && event.stopPropagation();
    }, true);
    // update UI
    update();
    // give focus to text box
    document.getElementById("q").focus();

}

/**
 * Removes markers from map.
 */
function removeMarkers() {
    for (let i = 0, n = markers.length; i < n; i++) {
        markers[i].setMap(null);
    }
    markers.length = 0;
}

/**
 * Searches database for typeahead's suggestions.
 */
function search(query, syncResults, asyncResults) {
    // get places matching query (asynchronously)
    axios.get(`/search?q=${query}`).then(response => {
        asyncResults(response.data);
    }).catch(error => console.log(error.toString()));
}

/**
 * Shows info window at marker with content.
 */
function showInfo(marker, content) {
    // start div
    let div = "<div id='info'>";
    div += typeof(content) === "undefined" ? "<img alt='loading' src='/static/ajax-loader.gif'/>" : content;
    div += "</div>";
    // set info window's content
    info.setContent(div);
    // open info window (if not already open)
    info.open(map, marker);
}

/**
 * Updates UI's markers.
 */
function update() {
    // get map's bounds
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    // get places within bounds (asynchronously)
    axios.get('/update', {
        params: {
            ne: ne.lat() + "," + ne.lng(),
            //q: document.getElementById("q").value,
            sw: sw.lat() + "," + sw.lng()
        }
    }).then(response => {
        removeMarkers();
        for (let i = 0, n = response.data.length; i < n; i++) {
            addMarker(response.data[i]);
        }
    }).catch(error => console.log(error.toString()));
}
