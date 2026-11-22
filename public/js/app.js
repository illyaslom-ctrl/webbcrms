(function () {
  'use strict';

  // Character counters: "0 / 2000", red when over the limit.
  document.querySelectorAll('[data-counter-for]').forEach(function (counter) {
    var field = document.getElementById(counter.getAttribute('data-counter-for'));
    if (!field) return;
    var max = Number(field.getAttribute('data-max'));
    function update() {
      var length = field.value.length;
      counter.textContent = length + ' / ' + max;
      counter.classList.toggle('is-over', length > max);
    }
    field.addEventListener('input', update);
    update();
  });

  // Photo counter and the 10 photo limit.
  var photos = document.getElementById('photos');
  var photoCount = document.getElementById('photos-count');
  var photoWarning = document.getElementById('photos-warning');
  if (photos && photoCount) {
    var template = photoCount.getAttribute('data-template') || '{n} / 10';
    photos.addEventListener('change', function () {
      var count = photos.files.length;
      if (count > 10) {
        photos.value = '';
        photoCount.textContent = template.replace('{n}', '0');
        if (photoWarning) photoWarning.hidden = false;
        return;
      }
      if (photoWarning) photoWarning.hidden = true;
      photoCount.textContent = template.replace('{n}', String(count));
    });
  }

  // Delete confirmation.
  document.querySelectorAll('form.js-confirm').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!window.confirm(form.getAttribute('data-confirm'))) event.preventDefault();
    });
  });

  // Level page: clicking a thumbnail shows it in the large view.
  var main = document.getElementById('gallery-main');
  if (main) {
    document.querySelectorAll('.thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = thumb.getAttribute('data-src');
        main.alt = thumb.getAttribute('data-alt');
        document.querySelectorAll('.thumb').forEach(function (t) {
          t.classList.toggle('is-active', t === thumb);
        });
      });
    });
    var first = document.querySelector('.thumb');
    if (first) first.classList.add('is-active');
  }
})();
