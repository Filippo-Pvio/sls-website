export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY is not configured' });
    return;
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.reviews'
      },
      body: JSON.stringify({
        textQuery: 'SLS Immobilienpartner GmbH Dorsten',
        languageCode: 'de',
        regionCode: 'DE',
        maxResultCount: 1
      })
    });

    if (!response.ok) {
      const body = await response.text();
      res.status(502).json({ error: 'Google Places request failed', details: body.slice(0, 500) });
      return;
    }

    const data = await response.json();
    const place = data.places && data.places[0];
    if (!place || typeof place.rating !== 'number') {
      res.status(404).json({ error: 'Google place or rating not found' });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      name: place.displayName?.text || 'SLS Immobilienpartner GmbH',
      address: place.formattedAddress || '',
      rating: place.rating,
      userRatingCount: place.userRatingCount || 0,
      googleMapsUri: place.googleMapsUri || 'https://share.google/qbk6kf2K0Cemc8Zeq',
      reviews: (place.reviews || []).slice(0, 5).map((review) => ({
        author: review.authorAttribution?.displayName || 'Google-Nutzer',
        authorUri: review.authorAttribution?.uri || '',
        photoUri: review.authorAttribution?.photoUri || '',
        rating: review.rating || 0,
        text: review.text?.text || review.originalText?.text || '',
        published: review.relativePublishTimeDescription || '',
        publishTime: review.publishTime || '',
        googleMapsUri: review.googleMapsUri || ''
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load Google rating' });
  }
}
