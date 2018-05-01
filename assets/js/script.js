$(function () {
    var allSets = ["60110-1","10671-1"];
    //var allSets = ["10671-1","10673-1","10680-1","10685-1","30272-1","30274-1","30276-1","30294-1","30313-1","30348-1","30371-1","31043-1","40195-1","40196-1","60003-1","60033-1","60043-1","60044-1","60051-1","60075-1","60078-1","60081-1","60084-1","60088-1","60096-1","60100-1","60108-1","60109-1","60110-1","60111-1","60117-1","60118-1","60119-1","60120-1","60122-1","60123-1","60130-1","60132-1","60140-1","60141-1","60144-1","60146-1","60147-1","60148-1","60150-1","60151-1","60152-1","60154-1","60169-1","60174-1","70149-1","70311-1","70312-1","70902-1","75106-1","75152-1","76034-1"];

    var base = "/assets/data/";//"https://brickset.com/exportscripts/inventory/";
    var set_image_base = "https://images.brickset.com/sets/small/";

    function loadStored(name) {
        try {
            var res = JSON.parse(localStorage.getItem(name));
            if(res === null || !res) {
                res = {};
            }
            return res;
        } catch(e) {
            return {}
        }
    }
    function isEmpty(obj) {
        return (Object.keys(obj).length === 0 && obj.constructor === Object);
    }

    var sets = loadStored("sets"), arrSets = [];
    var parts = loadStored("parts"), arrParts = [];
    var colors = loadStored("colors"), arrColors = [];
    var sorted_parts = loadStored("sorted");

    if(isEmpty(sets) || isEmpty(parts) || isEmpty(colors)) {
        sets = {}, parts = {}, colors = {};
    }

    var index = 0;
    var set = "60110-1";
    var total_parts = 0;
    var current_parts;
    var current_part;
    var filters = {};

    var main = {
        status: "Starting",
        setup: false,
        setup_text: "Setup",
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
    rivets.formatters.precent = function(set) {
        return ((set.sorted * 100) / set.total).toFixed(2)+'%';
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
                clear_filter(filterName, filter);
            } else {
                filters[filterName].push(filter);
            }
            renderFilterResults(filters, arrParts);
        },
        onPartSort: function(e, model) {
            if(main.setup) return;

            var set = model.set;
            var set_id = set.id;
            var part = current_part.PartID;

            sort_part(set, part);
            save_sorted_part(set_id, part);

            renderFilterResults(filters, arrParts);
        },
        onSetup: function() {
            if(main.setup) {
                main.setup = false;
                main.setup_text = "Setup";
                renderProductsPage();
            } else {
                for(var set in sets) {
                    sets[set].disabled = false;
                }
                current_part = null;
                main.setup = true;
                main.setup_text = "Back";
                renderSetsPage();
            }
        },
        onClearSorted: function(e, model) {
            var set = model.set;
            set.sorted = 0;
            for(var part in set.parts) {
                var diff = set.parts[part].Quantity - set.parts[part].current_count;
                parts[part].total_count += diff;
                set.parts[part].current_count += diff;

                var col = colors[parts[part].Colour];
                col.count += diff;
            }
            localStorage.setItem("sorted", JSON.stringify(sorted_parts));
        },
        onAllSorted: function(e, model) {
            var set = model.set;

            for(var part in set.parts) {
                var diff = set.parts[part].Quantity - (set.parts[part].Quantity - set.parts[part].current_count);
                sort_part(set, part, diff);
                save_sorted_part(set, part, diff, false);
            }
            localStorage.setItem("sorted", JSON.stringify(sorted_parts));
        }
    };
    rivets.bind( document, { data: main, controller: controller});

    function save_sorted_part(set, part, count=1, save=true) {
        if(typeof(set) != "string") {
            set = set.id;
        }
        if(!sorted_parts[set]) {
            sorted_parts[set] = {};
        }
        if(!sorted_parts[set][part]) {
            sorted_parts[set][part] = 0;
        }
        sorted_parts[set][part] += count;
        if(save) {
            localStorage.setItem("sorted", JSON.stringify(sorted_parts));
        }
    }

    function clear_filter(filterName, filter) {
        if(filters[filterName] && filters[filterName].includes(filter)) {
            var index = filters[filterName].indexOf(filter);

            filters[filterName].splice(index, 1);
            if(!filters[filterName].length){
                delete filters[filterName];
            }
        }
    }

    function sort_part(set, part, count=1) {
        if(typeof(set) == "string") {
            set = sets[set];
            if(!set) return;
        }
        if(set.parts[part].current_count < count) {
            count = set.parts[part].current_count;
        }
        set.parts[part].current_count -= count;
        parts[part].total_count -= count;

        set.sorted += count;

        var col = colors[parts[part].Colour];
        col.count -= count;
        if(!col.count) {
            clear_filter('Colour', col.name);
        }
        /*if(!parts[part].total_count) {
         var index = col.parts.indexOf(part);
         col.parts.splice(index, 1);
         }*/
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
        part.current_count = part.Quantity;

        colors[part.Colour].parts.push(part.PartID);
        colors[part.Colour].count += part.Quantity;

        if(!parts[part.PartID]) {
            part.sets = [set.id];
            parts[part.PartID] = part;
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
                init();
            } , sets[set]);
        }
    }

    function init() {
        arrSets = Object.values(sets);
        arrColors = Object.values(colors).sort(compare_color);
        arrParts = Object.values(parts).sort(compare_parts);

        localStorage.setItem("colors", JSON.stringify(colors));
        localStorage.setItem("parts", JSON.stringify(parts));
        localStorage.setItem("sets", JSON.stringify(sets));

        for(var set in sorted_parts) {
            var s_set = sorted_parts[set];
            for(var part in s_set) {
                sort_part(set, part, s_set[part]);
            }
        }

        main.colors =  arrColors;
        main.parts = arrParts;
        main.sets = arrSets;

        showStatus("Ready");
        renderProductsPage();
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

        if(sets[set]) {
            showStatus("Skipping "+set);
            if(index < allSets.length) {
                setTimeout(load, 1);
            } else {
                init();
            }
        } else {
            showStatus("Loading set "+set);

            Papa.parse(base+set, {
                download: true,
                header: true,
                dynamicTyping: true,
                complete: saveParsed
            });
        }
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

    function renderFilterResults(filters, arrParts) {
        if(isEmpty(filters)) {
            arrParts.forEach(function (item){
                item.disabled = false;
            });
        } else {
            var criteria = ['Colour','Category'];
            var results = [];
            var isFiltered = false;

            arrParts.forEach(function (item){
                item.disabled = true;
            });

            criteria.forEach(function (c) {
                if(filters[c] && filters[c].length){
                    filters[c].forEach(function (filter) {
                        arrParts.forEach(function (item){
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
        }
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
