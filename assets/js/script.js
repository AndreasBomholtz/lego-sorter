$(function () {
    var allSets = ["60110-1","10671-1"];
    //var allSets = ["10671-1","10673-1","10680-1","10685-1","30272-1","30274-1","30276-1","30294-1","30313-1","30348-1","30371-1","31043-1","40195-1","40196-1","60003-1","60033-1","60043-1","60044-1","60051-1","60075-1","60078-1","60081-1","60084-1","60088-1","60096-1","60100-1","60108-1","60109-1","60110-1","60111-1","60117-1","60118-1","60119-1","60120-1","60122-1","60123-1","60130-1","60132-1","60140-1","60141-1","60144-1","60146-1","60147-1","60148-1","60150-1","60151-1","60152-1","60154-1","60169-1","60174-1","70149-1","70311-1","70312-1","70902-1","75106-1","75152-1","76034-1"];

    var sets = {};
    var arrSets = [];
    var base = "/assets/data/";//"https://brickset.com/exportscripts/inventory/";
    var parts = {};
    var set_image_base = "https://images.brickset.com/sets/small/";

    var index = 0;
    var set = "60110-1";
    var total_parts = 0;
    var colors = {}, arrColors = [];
    var types = {};
    var current_parts;
    var sorted_parts = 0;
    try {
        var sorted_parts = JSON.parse(localStorage.getItem("sorted"));
    } catch (e) {
        sorted_parts = null;
    }
    if(sorted_parts === null) {
        sorted_parts = {};
    }
    var current_part;
    console.log(sorted_parts);

    var products = [];
    var filters = {};

    var main = {
        status: "Starting",
        show_parts: false,
        show_sets: false,
        colors: [],
        parts: [],
        sets: []
    };

    rivets.formatters.color = function(color) {
        return color.name+' ('+color.parts.length+'/'+color.count+')';
    }
    rivets.formatters.length = function(value) {
        return value.length ? value.length : 0;
    }
    rivets.formatters.parts = function(parts) {
        var total = 0;
        for(var part in parts) {
            if(parts[part].Quantity) {
                total += parts[part].Quantity;
            }
        }
        return total;
    }

    var controller = {
        onPartClick: function(e, model) {
            current_part = model.part;

            for(var set in sets) {
                if(sets[set].parts[model.part.PartID]) {
                    sets[set].part_count = sets[set].parts[model.part.PartID].current_count;
                }
            }

            renderFilterSets(current_part.PartID, arrSets);
        },
        onColorClick: function(e, model) {
            var filterName = 'Colour';
            var filter = model.color.name;

            if(!(filters[filterName] && filters[filterName].length)){
                filters[filterName] = [];
            }

            if(filters[filterName].includes(filter)) {
                var index = filters[filterName].indexOf(filter);

                filters[filterName].splice(index, 1);

                if(!filters[filterName].length){
                    delete filters[filterName];
                }
            } else {
                filters[filterName].push(filter);
            }
            renderFilterResults(filters, products);
        },
        onPartSort: function(e, model) {
            var set = model.set;
            var set_id = set.id;
            var part = current_part.PartID;

            sort_part(set, part);

            if(!sorted_parts[set_id]) {
                sorted_parts[set_id] = {};
            }
            if(!sorted_parts[set_id][part]) {
                sorted_parts[set_id][part] = 0;
            }
            sorted_parts[set_id][part]++;
            localStorage.setItem("sorted", JSON.stringify(sorted_parts));

            renderFilterResults(filters, products);
        },
        onClearSorted: function(e, model) {
            localStorage.setItem("sorted", null);
            sorted_parts = {};
        }
    };
    rivets.bind( document, { data: main, controller: controller});

    function sort_part(set, part) {
        if(typeof(set) == "string") {
            set = sets[set];
        }
        parts[part].total_count--;
        set.parts[part].current_count--;
        set.sorted++;
        set.precent = ((set.sorted * 100) / set.total).toFixed(2)+'%';

        var col = colors[parts[part].Colour];
        col.count--;
        if(!parts[part].total_count) {
            var index = col.parts.indexOf(part);
            col.parts.splice(index, 1);
        }
    }

    function run(data, func, done, arg) {
        var busy = false;
        var i=0;
        var proc = setInterval(function() {
            if(!busy) {
                busy = true;
                func(data[i], arg);

                if(++i == data.length) {
                    clearInterval(proc);
                    done();
                }
                busy = false;
            }
        }, 1);
    }

    function sort_parts(part, set) {
        if(part.Category === undefined) {
            return;
        }

        if(!colors[part.Colour]) {
            colors[part.Colour] = {
                name: part.Colour,
                count: 0,
                parts: []
            };
        }
        if(!types[part.Category]) {
            types[part.Category] = [];
        }
        part.current_count = part.Quantity;

        colors[part.Colour].parts.push(part.PartID);
        colors[part.Colour].count += part.Quantity;

        if(!parts[part.PartID]) {
            part.sets = [set.id];
            parts[part.PartID] = part;
            types[part.Category].push(part.PartID);
            parts[part.PartID].total_count = part.Quantity;
        } else {
            parts[part.PartID].sets.push(set.id);
            parts[part.PartID].total_count += part.Quantity;
        }

        total_parts += part.Quantity;
    }

    function saveParsed(data) {
        //var sets = localStorage.getItem("sets");
        if(sets === null) {
            sets = {};
        }
        sets[set] = {
            id: set,
            ImageURL: set_image_base+set+".jpg",
            sorted: 0,
            part_count: 0,
            total: 0,
            precent: '0%',
            parts: {}
        };
        for(var i=0; i<data.data.length; i++) {
            var part = data.data[i];
            if(part.PartID) {
                part.link = "part/"+part.PartID;
                sets[set].parts[part.PartID] = part;
                sets[set].total += part.Quantity;
            }
        }

        //localStorage.setItem("sets", JSON.stringify(sets))

        showStatus("Sorting parts from "+set);
        if(index < allSets.length) {
            run(data.data, sort_parts, load, sets[set]);
        } else {
            run(data.data, sort_parts, function() {
                arrSets = Object.values(sets);

                for(var set in sorted_parts) {
                    var s_set = sorted_parts[set];
                    for(var part in s_set) {
                        sort_part(set, part);
                    }
                }

                showStatus("Sorting colors");
                arrColors = Object.values(colors).sort(compare_color);

                showStatus("Rendering parts");
                products = Object.values(parts).sort(compare_parts);

                main.colors =  arrColors;
                main.parts = products;
                main.sets = arrSets;

                showStatus("Ready");
                renderProductsPage();
            } , sets[set]);
        }
    }

    function compare_parts(a,b) {
        if (a.total_count > b.total_count)
            return -1;
        if (a.total_count < b.total_count)
            return 1;
        return 0;
    }

    function compare_color(a,b) {
        if (a.parts.length > b.parts.length)
            return -1;
        if (a.parts.length < b.parts.length)
            return 1;
        return 0;
    }

    function load() {
        set = allSets[index++];

        showStatus("Loading set "+set);

        Papa.parse(base+set, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: saveParsed
        });
    }
    load();

    function showStatus(msg) {
        main.status = msg;
    }

    function renderProductsPage() {
        main.show_parts = true;
        main.show_sets = false;
    }

    function renderSetsPage() {
        main.show_parts = false;
        main.show_sets = true;
    }

    function renderFilterResults(filters, products) {
        if(Object.keys(filters).length === 0 && filters.constructor === Object) {
            products.forEach(function (item){
                item.disabled = false;
            });
            return;
        }
        var criteria = ['Colour','Category'];
        var results = [];
        var isFiltered = false;

        products.forEach(function (item){
            item.disabled = true;
        });

        criteria.forEach(function (c) {
            if(filters[c] && filters[c].length){
                filters[c].forEach(function (filter) {
                    products.forEach(function (item){
                        if(item.total_count > 0) {
                            if(typeof item[c] == 'number'){
                                if(item[c] == filter){
                                    item.disabled = false;
                                }
                            }

                            if(typeof item[c] == 'string'){
                                if(item[c].indexOf(filter) != -1){
                                    item.disabled = false;
                                }
                            }
                        }
                    });
                });
            }
        });

        renderProductsPage();
    }

    function renderFilterSets(part, sets) {
        var criteria = ['id'];
        var filters = parts[part].sets;

        sets.forEach(function (item) {
            item.disabled = true;
        });

        filters.forEach(function (filter) {
            sets.forEach(function (item) {
                if(item.id == filter) {
                    if(item.parts[part].current_count) {
                        item.disabled = false;
                    }
                }
            });
        });

        renderSetsPage();
    }
});
