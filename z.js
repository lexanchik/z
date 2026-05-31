(function () {
    'use strict';

    // Уникальное имя компонента и базовый URL
    var plugin_name = 'NoodleParser';
    var base_url = 'https://hot.noodlemagazine.com';

    // 1. Создаем новый компонент Lampa
    Lampa.Component.add(plugin_name, function () {
        var network = new Lampa.Network();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="category-full"></div>');

        // Вызывается при открытии компонента
        this.create = function () {
            this.activity.loader(true);
            
            // Запрашиваем HTML главной страницы сайта
            network.request(base_url, this.parse.bind(this), this.error.bind(this), false, {
                dataType: 'text'
            });
            return this.render();
        };

        // Парсинг полученного HTML
        this.parse = function (data) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(data, 'text/html');
            var parsedItems = [];

            // ВАЖНО: Замени селекторы на актуальные классы с сайта
            // Обычно это контейнеры с видео, например .video-item или .thumb
            var elements = doc.querySelectorAll('.item'); 
            
            elements.forEach(function(el) {
                var titleEl = el.querySelector('.title');
                var imgEl = el.querySelector('img');
                var linkEl = el.querySelector('a');

                if (titleEl && linkEl) {
                    var img_src = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : '';
                    var link_href = linkEl.getAttribute('href');
                    
                    parsedItems.push({
                        title: titleEl.innerText || titleEl.textContent,
                        picture: img_src.startsWith('http') ? img_src : base_url + img_src,
                        url: link_href.startsWith('http') ? link_href : base_url + link_href,
                        is_folder: false
                    });
                }
            });

            if (parsedItems.length === 0) {
                this.empty();
            } else {
                this.build(parsedItems);
            }
        };

        // Построение сетки карточек
        this.build = function (data) {
            this.activity.loader(false);
            var _this = this;
            
            data.forEach(function (element) {
                // Создаем стандартную карточку Lampa
                var card = Lampa.Template.get('card', element);
                card.on('hover:enter', function () {
                    _this.play(element);
                });
                body.append(card);
                items.push(card);
            });
            
            html.append(scroll.render());
            scroll.append(body);
            this.layer = html;
        };

        // Логика запуска видео
        this.play = function (element) {
            Lampa.Loading.start(function () {});
            
            // Запрашиваем страницу самого видео по ссылке из карточки
            network.request(element.url, function(html_page) {
                Lampa.Loading.stop();
                
                // ВАЖНО: Регулярное выражение для поиска прямой ссылки на видео.
                // Возможно, на сайте используется iframe, тогда нужно парсить его src и делать еще один запрос.
                // Данный Regex ищет стандартный тег <source src="...mp4"> или JSON с ссылкой.
                var match = html_page.match(/(https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/i);
                
                if (match && match[1]) {
                    var video_url = match[1];
                    var player_data = {
                        title: element.title,
                        url: video_url
                    };
                    
                    Lampa.Player.play(player_data);
                    Lampa.Player.playlist([player_data]);
                } else {
                    Lampa.Noty.show('Не удалось найти прямую ссылку на видео');
                }
            }, function() {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка загрузки страницы видео');
            }, false, { dataType: 'text' });
        };

        this.empty = function() {
            this.activity.loader(false);
            html.append('<div class="empty">Ничего не найдено. Проверьте селекторы парсера.</div>');
        };

        this.error = function () {
            this.activity.loader(false);
            Lampa.Noty.show('Ошибка соединения с сайтом');
        };

        this.render = function () {
            return html;
        };
    });

    // 2. Добавление кнопки в главное меню
    function addMenu() {
        var item = {
            title: 'Hot Noodle',
            icon: 'tv',
            onSelect: function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Hot Noodle',
                    component: plugin_name,
                    page: 1
                });
            }
        };
        // Добавляем в основной раздел меню
        Lampa.Menu.add('main', item);
    }

    // Инициализация плагина после загрузки приложения
    if (window.appready) {
        addMenu();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                addMenu();
            }
        });
    }

})();
