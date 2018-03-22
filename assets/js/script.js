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

    var products = [];
    var filters = {};

    var checkboxes = $('.all-products input[type=checkbox]');

    function bindCheckboxes() {
        checkboxes = $('.all-products input[type=checkbox]');
        checkboxes.click(function () {

            var that = $(this);
            var filterName = that.attr('name');

            if(filters[filterName]) {
                filters[filterName].forEach(function(c) {
                    if(!colors[c].count) {
                        var index = filters[filterName].indexOf(c);
                        filters[filterName].splice(index, 1);
                    }
                });
            }

            if(that.is(":checked")) {
                if(!(filters[filterName] && filters[filterName].length)){
                    filters[filterName] = [];
                }

                filters[filterName].push(that.val());

                createQueryHash(filters);
            }

            if(!that.is(":checked")) {
                if(filters[filterName] && filters[filterName].length && (filters[filterName].indexOf(that.val()) != -1)){
                    var index = filters[filterName].indexOf(that.val());

                    filters[filterName].splice(index, 1);

                    if(!filters[filterName].length){
                        delete filters[filterName];
                    }
                }
                createQueryHash(filters);
            }
        });
    }

    $('.filters button').click(function (e) {
        e.preventDefault();
        window.location.hash = '#';
    });

    var singleProductPage = $('.single-product');

    singleProductPage.on('click', function (e) {
        if (singleProductPage.hasClass('visible')) {
            var clicked = $(e.target);
            if (clicked.hasClass('close') || clicked.hasClass('overlay')) {
                createQueryHash(filters);
            }
        }
    });

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
        sets[set] = {id: set,
                     ImageURL: set_image_base+set+".jpg",
                     parts: {}
                    };
        for(var i=0; i<data.data.length; i++) {
            var part = data.data[i];
            sets[set].parts[part.PartID] = part;
        }

        //localStorage.setItem("sets", JSON.stringify(sets))

        showStatus("Sorting parts from "+set);
        if(index < allSets.length) {
            run(data.data, sort_parts, load, sets[set]);
        } else {
            run(data.data, sort_parts, function() {
                arrSets = Object.values(sets);

                showStatus("Sorting colors");
                arrColors = Object.values(colors).sort(compare_color);
                updateColors();

                showStatus("Rendering parts");
                products = Object.values(parts).sort(compare_parts);
                generateAllPartsHTML(products);


                showStatus("Rending sets");
                generateAllSetsHTML(sets);

                showStatus("Ready");
                $(window).trigger('hashchange');
            } , sets[set]);
        }
    }

    function updateColors() {
        $("#filter-color").empty();
        arrColors.forEach(function(color) {
            if(color.count) {
                $("#filter-color").append('<label><input type="checkbox" name="Colour" value="'+color.name+'">'+color.name+' ('+color.parts.length+'/'+color.count+')</label>');
            }
        });

        bindCheckboxes();
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

    $(window).on('hashchange', function(){
        render(decodeURI(window.location.hash));
    });

    function render(url) {
        var temp = url.split('/')[0];
        $('.main-content .page').removeClass('visible');

        var map = {
            '': function() {
                filters = {};
                checkboxes.prop('checked',false);

                renderProductsPage(products);
            },
            '#part': function() {
                var part = url.split('#part/')[1].trim();

                renderFilterSets(part, arrSets);
            },
            '#filter': function() {
                url = url.split('#filter/')[1].trim();

                try {
                    filters = JSON.parse(url);
                } catch(err) {
                    window.location.hash = '#';
                    return;
                }

                renderFilterResults(filters, products);
            }
        };

        if(map[temp]){
            map[temp]();
        } else {
            renderErrorPage();
        }
    }

    function showStatus(msg) {
        var header = $('header').find('span').text(msg);
    }

    function generateAllPartsHTML(data){
        var list = $('.all-products .products-list');

        var theTemplateScript = $("#products-template").html();

        var theTemplate = Handlebars.compile (theTemplateScript);
        list.append (theTemplate(data));

        list.find('li').on('click', function (e) {
            e.preventDefault();

            var partIndex = $(this).data('index');

            window.location.hash = 'part/' + partIndex;
        })
    }

    function generateAllSetsHTML(data) {
        var list = $('.single-product .sets-list');

        var theTemplateScript = $("#sets-template").html();

        var theTemplate = Handlebars.compile (theTemplateScript);
        list.append (theTemplate(data));

        list.find('li').on('click', function (e) {
            e.preventDefault();

            var set = $(this).data('index');
            var part = window.location.hash.split('#part/')[1].trim();

            parts[part].total_count--;
            sets[set].parts[part].current_count--;

            var htmlPart = $('.all-products .products-list > li').filter('[data-index="'+part+'"]').find("#count").text(parts[part].total_count);

            var col = colors[parts[part].Colour];
            col.count--;
            if(!parts[part].total_count) {
                var index = col.parts.indexOf(part);
                col.parts.splice(index, 1);
            }

            updateColors();

            window.history.back();
        })
    }

    function renderProductsPage(data){
        var page = $('.all-products');
        var allProducts = $('.all-products .products-list > li');

        allProducts.addClass('hidden');

        allProducts.each(function () {
            var that = $(this);

            data.forEach(function (item) {
                if(that.data('index') == item.PartID){
                    that.removeClass('hidden');
                }
            });
        });
        page.addClass('visible');
    }

    function renderSetsPage(data){
        var page = $('.single-product');

        var allSets = $('.single-product .sets-list > li');

        allSets.addClass('hidden');

        allSets.each(function () {
            var that = $(this);

            data.forEach(function (item) {
                if(that.data('index') == item.id) {
                    that.removeClass('hidden');
                }
            });
        });
        /*
         var container = $('.preview-large');

         if(data.length){
         data.forEach(function (item) {
         if(item.PartID == index){
         container.find('h3').text(item.name);
         //container.find('img').attr('src', item.ImageURL);
         container.find('p').text(item.sets);
         }
         });
         }
         */
        page.addClass('visible');
    }

    function renderFilterResults(filters, products){
        var criteria = ['Colour','Category'];
        var results = [];
        var isFiltered = false;

        checkboxes.prop('checked', false);

        criteria.forEach(function (c) {
            if(filters[c] && filters[c].length){
                if(isFiltered){
                    products = results;
                    results = [];
                }
                filters[c].forEach(function (filter) {
                    products.forEach(function (item){
                        if(item.total_count > 0) {
                            if(typeof item[c] == 'number'){
                                if(item[c] == filter){
                                    results.push(item);
                                    isFiltered = true;
                                }
                            }

                            if(typeof item[c] == 'string'){
                                if(item[c].indexOf(filter) != -1){
                                    results.push(item);
                                    isFiltered = true;
                                }
                            }
                        }
                    });

                    if(c && filter){
                        $('input[name='+c+'][value="'+filter+'"]').prop('checked',true);
                    }
                });
            }
        });

        renderProductsPage(results);
    }

    function renderFilterSets(part, sets) {
        var criteria = ['id'];
        var results = [];
        var filters = parts[part].sets;

        filters.forEach(function (filter) {
            sets.forEach(function (item) {
                if(item.id == filter) {
                    if(item.parts[part].current_count) {
                        results.push(item);
                    }
                }
            });
        });

        renderSetsPage(results);
    }

    function renderErrorPage(){
        var page = $('.error');
        page.addClass('visible');
    }

    function createQueryHash(filters){
        if(!$.isEmptyObject(filters)){
            window.location.hash = '#filter/' + JSON.stringify(filters);
        } else {
            window.location.hash = '#';
        }
    }

});
