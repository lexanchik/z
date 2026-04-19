(function () {
  'use strict';

  const API = 'https://lampac.ga/'; // можно менять

  function request(url, ok, err) {
    const net = new Lampa.Reguest();
    net.native(url, ok, err || function(){});
  }

  function parse(html) {
    try {
      const root = $('<div>' + html + '</div>');
      const items = [];

      root.find('.videos__item').each(function () {
        const el = $(this);
        const data = JSON.parse(el.attr('data-json') || '{}');

        data.title = el.text();
        data.active = el.hasClass('active');

        items.push(data);
      });

      return items;
    } catch (e) {
      return [];
    }
  }

  function clean(items) {
    return items.filter(i => {
      const bad = JSON.stringify(i).toLowerCase();

      return (
        (i.method === 'play' || i.method === 'call') &&
        !bad.includes('ads') &&
        !bad.includes('promo') &&
        !bad.includes('vast')
      );
    });
  }

  function play(item) {
    if (item.method === 'play') {
      Lampa.Player.play(item);
    } else {
      request(item.url, function (json) {
        if (!json || !json.url) return;

        delete json.vast;

        Lampa.Player.play({
          url: json.url,
          title: item.title,
          quality: json.quality
        });
      });
    }
  }

  function component(object) {
    const scroll = new Lampa.Scroll({ mask: true, over: true });

    this.create = function () {
      return this.render();
    };

    this.initialize = function () {
      this.load();
    };

    this.load = function () {
      request(API + 'lite/events', (sources) => {

        if (!sources || !sources.length) {
          return this.empty();
        }

        const source = sources[0].url;

        request(source, (html) => {

          let items = clean(parse(html));

          if (!items.length) {
            return this.empty();
          }

          this.renderItems(items);

        }, this.empty.bind(this));

      }, this.empty.bind(this));
    };

    this.renderItems = function (items) {
      scroll.clear();

      items.forEach((item) => {
        const el = $('<div class="simple-item">' + item.title + '</div>');

        el.on('hover:enter', () => play(item));

        scroll.append(el);
      });

      Lampa.Controller.enable('content');
    };

    this.empty = function () {
      scroll.body().html(
        '<div style="padding:2em;text-align:center;">Нет фильмов</div>'
      );
    };
  }

  // 👉 Регистрируем плагин
  Lampa.Component.add('my_movies_plugin', component);

})();
