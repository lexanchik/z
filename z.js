(function () {
  'use strict';

  // ===== CONFIG =====
  const APIS = [
    'https://lampac.ga/',
    'https://lampac.su/',
    'https://bwa-cloud.apn.monster/',
    'https://api.vokino.tv/'
  ];

  const CACHE_TIME = 1000 * 60 * 5;

  const cache = {};

  // ===== REQUEST =====
  function request(url, ok, err) {
  }

  // ===== PARSE =====
  function parse(html) {
  }

  // ===== ANTIBLOCK =====
  function clean(items) {
    return items.filter(i => {
      if (!i) return false;

      const bad = JSON.stringify(i).toLowerCase();

      return (
        (i.method === 'play' || i.method === 'call') &&
        !bad.includes('ads') &&
        !bad.includes('advert') &&
        !bad.includes('promo') &&
        !bad.includes('banner') &&
        !bad.includes('vast') &&
        !bad.includes('vip')
      );
    });
  }

  // ===== LOAD SOURCES =====
  function loadSources(done) {
    let finished = false;

    APIS.forEach(api => {
      request(api + 'lite/events', (sources) => {
        if (finished || !sources || !sources.length) return;

        finished = true;
        done(sources);
      });
    });

    setTimeout(() => {
      if (!finished) done([]);
    }, 3000);
  }

  // ===== BEST SOURCE =====
  function bestSource(sources, done) {
    let doneFlag = false;

    sources.slice(0, 3).forEach(src => {
      request(src.url, (html) => {
        if (doneFlag) return;

        const items = clean(parse(html));

        if (items.length) {
          doneFlag = true;
          done(items);
        }
      });
    });

    setTimeout(() => {
      if (!doneFlag && sources.length) {
        request(sources[0].url, (html) => {
          done(clean(parse(html)));
        });
      }
    }, 2000);
  }

  // ===== PLAY =====
  function play(item) {
    if (item.method === 'play') {
      Lampa.Player.play(item);
    } else {
      request(item.url, (json) => {
        if (!json || !json.url) return;

        // remove ads
        delete json.vast;

        if (json.url.includes('ads')) return;

        Lampa.Player.play({
          url: json.url,
          title: item.title,
          quality: json.quality || item.quality
        });
      });
    }
  }

  // ===== COMPONENT =====
  function component(object) {
    const scroll = new Lampa.Scroll({ mask: true, over: true });

    this.create = function () {
      return this.render();
    };

    this.initialize = function () {
      this.load();
    };

    this.load = function () {
      loadSources((sources) => {

        if (!sources.length) return this.empty();

        bestSource(sources, (items) => {

          if (!items.length) return this.empty();

          this.renderItems(items);

        });

      });
    };

    this.renderItems = function (items) {
      scroll.clear();

      items.forEach(item => {
        const el = $('<div class="simple-item">' + item.title + '</div>');

        el.on('hover:enter', () => play(item));

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

  // ===== INIT =====
  Lampa.Component.add('online_ultra_clean', component);

})();
