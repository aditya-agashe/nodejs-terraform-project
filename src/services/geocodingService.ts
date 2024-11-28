const openWeatherMapApiKey = process.env.OPEN_WEATHER_MAP_API_KEY;

export const getLatLon = async (city: string): Promise<Coordinate> => {
  const geocodingURl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=${openWeatherMapApiKey}`;

  const response = await fetch(geocodingURl);
  if (!response.ok) {
    throw new Error(`Geocoding api endpoint returned response: ${response.status}`);
  }

  const data: Array<Coordinate> = await response.json();

  if (data.length === 0) {
    console.log(`No coordinates found for city: ${city}`);
    throw new Error(`No coordinates found for city: ${city}`);
  }

  const { lat, lon } = data[0];
  console.log(`Latitude: ${lat}, Longitude: ${lon}`);
  return { lat, lon };
};
