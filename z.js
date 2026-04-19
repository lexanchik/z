(function () {
  'use strict';

  const API = 'https://lampac.ga/'; // можно менять сервер

  function request(url, callback, error) {
    const net = new Lampa.Reguest();
    net.native(url, callback, error || function(){});
  }

  function parse(html, selector) {
    try {
      const root = $('<div>' + html + '</div>');
      const items = [];

      root.find(selector).each(function () {
        const el = $(this);
        const json = JSON.parse(el.attr('data-json') || '{}');

        json.title = el.text();
        json.active = el.hasClass('active');

        items.push(json);
      });

      return items;
    } catch (e) {
      return [];
    }
  }

  function cleanItems(items) {
    return items.filter(i => {
      return (
        !i.advertising &&
        !i.ads &&
        !i.vast &&
        (i.method === 'play' || i.method === 'call')
      );
    });
  }

  function play(item) {
    if (item.method === 'play') {
      Lampa.Player.play(item);
    } else {
      request(item.url, function (json) {
        if (!json || !json.url) return;

        // удаляем рекламу
        delete json.vast;

        Lampa.Player.play({
          url: json.url,
          title: item.title,
          quality: json.quality || item.quality
        });
      });
    }
  }

  function component(object) {
    const scroll = new Lampa.Scroll({ mask: true, over: true });
    const files = new Lampa.Explorer(object);

    this.create = function () {
      return this.render();
    };

    this.initialize = function () {
      this.load();
    };

    this.load = function () {
      const url = API + 'lite/events';

      request(url, (sources) => {
        if (!sources || !sources.length) {
          return this.empty();
        }

        // берём первый источник
        const source = sources[0].url;

        request(source, (html) => {
          let items = parse(html, '.videos__item');

          items = cleanItems(items);

          if (!items.length) {
            return this.empty();
          }

          this.renderItems(items);
        }, this.empty.bind(this));

      }, this.empty.bind(this));
    };

    this.renderItems = function (items) {
      const _this = this;

      scroll.clear();

      items.forEach((item) => {
        const el = $('<div class="simple-item">' + item.title + '</div>');

        el.on('hover:enter', function () {
          play(item);
        });

        scroll.append(el);
      });

      Lampa.Controller.enable('content');
    };

    this.empty = function () {
      scroll.body().html(
        '<div style="padding:2em;text-align:center;">Нет видео</div>'
      );
    };
  }

  Lampa.Component.add('online_clean_v2', component);
})();
