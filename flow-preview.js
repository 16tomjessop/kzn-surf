const spots = {
  Scottburgh: {
    region: 'Upper South Coast',
    score: '8.4',
    headline: 'Go early while the WNW keeps it clean.',
    summary: 'Best two-hour pulse is around 06:00-08:00, with enough size for most boards and a forgiving dropping tide.',
    slotTitle: 'Best push',
    slotText: 'Chest high, clean, WNW offshore',
    slotRating: '8.4',
    swell: '1.3 m · 11 s',
    wind: 'WNW · 7 km/h',
    shape: 'Peeling corners'
  },
  'Green Point': {
    region: 'Upper South Coast',
    score: '7.1',
    headline: 'More size once the tide drops into shape.',
    summary: 'Green Point has the stronger walls, but it wants the tide moving and a bit more patience between sets.',
    slotTitle: 'Tide comes right',
    slotText: 'Head high sets, cross-off, longer walls',
    slotRating: '7.1',
    swell: '1.6 m · 12 s',
    wind: 'W · 9 km/h',
    shape: 'Longer right walls'
  },
  'North Beach': {
    region: 'Durban',
    score: '4.6',
    headline: 'Small and playful before the wind gets into it.',
    summary: 'Worth a quick swim if you are nearby, but the south coast spots have more shape and more push today.',
    slotTitle: 'Quick dip',
    slotText: 'Waist high, light texture, soft peaks',
    slotRating: '4.6',
    swell: '0.8 m · 9 s',
    wind: 'WNW · 6 km/h',
    shape: 'Soft beach peaks'
  }
};

const fields = {
  name: document.querySelector('#detailName'),
  region: document.querySelector('#detailRegion'),
  score: document.querySelector('#detailScore'),
  headline: document.querySelector('#detailHeadline'),
  summary: document.querySelector('#detailSummary'),
  slotTitle: document.querySelector('#slotOneTitle'),
  slotText: document.querySelector('#slotOneText'),
  slotRating: document.querySelector('#slotOneRating'),
  swell: document.querySelector('#swellDetail'),
  wind: document.querySelector('#windDetail'),
  shape: document.querySelector('#shapeDetail')
};

document.querySelectorAll('.spot-card').forEach(card => {
  card.addEventListener('click', () => {
    const spot = spots[card.dataset.spot];
    if (!spot) return;

    document.querySelectorAll('.spot-card').forEach(item => item.classList.remove('active'));
    card.classList.add('active');

    fields.name.textContent = card.dataset.spot;
    fields.region.textContent = spot.region;
    fields.score.textContent = spot.score;
    fields.headline.textContent = spot.headline;
    fields.summary.textContent = spot.summary;
    fields.slotTitle.textContent = spot.slotTitle;
    fields.slotText.textContent = spot.slotText;
    fields.slotRating.textContent = spot.slotRating;
    fields.swell.textContent = spot.swell;
    fields.wind.textContent = spot.wind;
    fields.shape.textContent = spot.shape;
  });
});
