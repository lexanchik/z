(function() {
  'use strict';

  var Defined = {
    api: 'lampac',
    localhost: 'https://lampac.ga/', // ← чистый сервер
    apn: ''
  };

  var Network = Lampa.Reguest;

  function account(url) {
    return url; // полностью убрали трекинг
  }

  function component(object) {
    var network = new Network();
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);

    var sources = {};
    var balanser;
    var source;

    this.initialize = function() {
      this.loading(true);

      this.createSource().then(() => {
        this.search();
      }).catch(() => {
        this.empty();
      });
    };

    this.createSource = function() {
      return new Promise((resolve, reject) => {
        var url = Defined.localhost + 'lite/events';

        network.silent(url, (json) => {
          json.forEach((j) => {
            sources[j.name] = {
              url: j.url,
              name: j.name,
              show: true
            };
          });

          var keys = Object.keys(sources);
          if (!keys.length) return reject();

          balanser = keys[0];
          source = sources[balanser].url;

          resolve();
        }, reject);
      });
    };

    this.search = function() {
      this.request(source);
    };

    this.request = function(url) {
      network.native(url, this.parse.bind(this), () => {
        this.empty();
      });
    };

    this.parse = function(str) {
      var items = this.parseJsonDate(str, '.videos__item');

      // 🚫 УБИРАЕМ РЕКЛАМУ
      items = items.filter(i => {
        return !i.advertising && !i.ads && !i.vast;
      });

      var videos = items.filter(v => v.method == 'play' || v.method == 'call');

      if (videos.length) {
        this.display(videos);
      } else {
        this.empty();
      }
    };

    this.parseJsonDate = function(str, name) {
      try {
        var html = $('<div>' + str + '</div>');
        var elems = [];

        html.find(name).each(function() {
          var item = $(this);
          var data = JSON.parse(item.attr('data-json'));

          data.text = item.text();
          data.active = item.hasClass('active');

          elems.push(data);
        });

        return elems;
      } catch (e) {
        return [];
      }
    };

    this.display = function(videos) {
      var _this = this;

      this.draw(videos, {
        onEnter: function(item) {
          _this.getFileUrl(item, function(json) {
            if (json && json.url) {
              // 🚫 убираем VAST рекламу
              delete json.vast;

              Lampa.Player.play({
                url: json.url,
                title: item.title,
                quality: json.quality
              });
            }
          });
        }
      });
    };

    this.getFileUrl = function(file, call) {
      if (file.method == 'play') call(file);
      else {
        network.native(file.url, function(json) {
          // 🚫 чистим рекламу из ответа
          if (json && json.vast) delete json.vast;

          call(json);
        }, function() {
          call(false);
        });
      }
    };

    this.empty = function() {
      scroll.body().html('<div style="padding:2em;text-align:center;">Нет данных</div>');
    };

    this.loading = function(status) {
      if (status) this.activity.loader(true);
      else this.activity.loader(false);
    };

    this.create = function() {
      return this.render();
    };
  }

  Lampa.Component.add('online_mod_clean', component);
})();