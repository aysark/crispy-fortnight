var express = require('express');
const fetch = require('node-fetch');

var router = express.Router();
const Vehicle = require('../models/Vehicle.js');
const Condition = require('../models/Condition.js');
const DarkSkyApi = 'https://api.darksky.net/forecast/0bd21a94dacb28ee3b7fcf1e473b32f9/';
var MojioClientLite= require("mojio-client-lite");

var config = {
    application: '291abb68-ac68-44ae-baf0-f6caf81f0152',
    secret:'82c47df8-85e6-4558-a1ec-03372fb6d0c0',
    // environment: 'development',
    accountsURL: 'accounts.moj.io',
    apiURL: 'api.moj.io',
    pushURL: 'push.moj.io',
    scope:'full',
    acceptLanguage:'en',
};

var mojio_client = new MojioClientLite(config);

router.get('/:vin', function(req, res, next) {
  const vin = req.params.vin;
  Vehicle.findOne({'vin':vin}, (err, vehicle, msg) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error finding vehicle' });
    }
    if (vehicle) {
      return res.json(vehicle);
    }
    return res.status(404).json({error: 'Not found'});
  })
});

router.get('/:vin/conditions', function(req, res, next) {
  const vin = req.params.vin;
  const geohash = req.params.geohash || '';
  const lat = req.params.lat;
  const lng = req.params.lng;
  const headingDirection = req.params.headingDirection;
  const headingDegree = req.params.headingDegree;

  // TODO: calculate geohash if its empty
  Condition.find({'geohash': new RegExp('^'+geohash, 'i')}, (err, conditions, msg) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error finding condition' });
    }
    // console.info(conditions);
    if (conditions) {
      let conditionsWithinProximity = [];
      conditions.forEach((e) => {
        // if geohash is within proxmity of ~5km
        if (e.occurrence >= 5 && e.geohash.match(geohash.substr(0,5)).length >= 1) {
          // TODO: then get geocode lat/lng and heading to ensure heading is on current road
          conditionsWithinProximity.push(e);
        }
      });
      return res.json(conditionsWithinProximity);
    }
    return res.status(404).json({error: 'Not found'});
  });
});

router.post('/:vin/report', function(req, res, next) {
  console.log(req.body);
  return res.json({success: true});
});

router.get('/observe', function(req, res, next) {
  mojio_client.authorize('infinitone',',Ms6NxVKB2ePMM').then(function(result,err){
      if (typeof(err) != "undefined") {
        console.log(err);
        return res.status(500).json({ error: 'Error with auth' });
      }
      const base_url = 'https://' + req.get('host');
      console.log(base_url);

      const data = {
          "Key" : "movingCar",
          "Conditions": "IgnitionState.value eq true and Speed.value gt 0",
          "Timing": "High", // trailing, leading, high, low
          "Transports" : [{
                  "Type" : "HttpPost",
                  "Address" : base_url + "/vehicles/conditions"
              }],
          // "Fields": ["Speed", "RPM"] // limit the fields in the response
      };

      mojio_client.post("https://push.moj.io/v2/vehicles", data).then(function(result,err){
        if (typeof(err) != "undefined") {
          console.log(err);
          return res.status(500).json({ error: 'Error with observer creation' });
        }
        console.log(result);
        return res.json(result);
      }).catch(function(error) {
        console.error(error);
        return res.status(500).json(error);
      });
  }).catch(function(error) {
    console.error(error);
    return res.status(500).json(error);
  });
});

router.post('/conditions', function(req, res, next) {
  // console.log(req.body);
  const vin = req.body.VIN;
  const rpm = req.body.RPM.Value; // RevolutionsPerMinute
  const speed = req.body.Speed.Value; // KilometersPerHour
  const acc = req.body.Acceleration.Value; // KilometersPerHourPerSecond
  const dec = req.body.Deceleration.Value; // KilometersPerHourPerSecond
  const accelerometer = req.body.Accelerometer; // MilliGUnits
  const headingDirection = req.body.Heading.Direction; // MilliGUnits
  const headingDegree = req.body.Heading.Value;
  const lat = req.body.Location.Lat;
  const lng = req.body.Location.Lng;
  const altitude = req.body.Location.Altitude;
  const geohash = req.body.Location.GeoHash;
  const eventTime = req.body.EventTime;

  // update current car Location
  const vehiclePayload = {
    vin: vin,
    lat: lat,
    lng: lng,
    geohash: geohash,
    headingDirection: headingDirection,
    headingDegree: headingDegree,
    speed: speed
  }
  console.log(vehiclePayload);
  const vehicle = new Vehicle(vehiclePayload);
  Vehicle.findOneAndUpdate({'vin':vin}, vehiclePayload, {upsert: true}, (err, result) => {
    if (err) {
      console.log(err);
    }
    console.log('Successfully saved vehicle data', result);
  });

/*
  // TODO: detect valid condition
  // check for slippery conditions
  if (rpm) {
    // fetch current weather at that Location
    // fetch(DarkSkyApi+lat+','+lng)
    // .then(function(res) {
    //     return res.json();
    // }).then(function(json) {
    //     console.log('weather', json);
    // });

    // assume weather data for now for demo
    const weatherResponse = {
      summary: 'Heavy Sleet',
      nearestStormDistance: 100,
      nearestStormBearing: 5,
      precipIntensity: 100,
      precipProbability: 1,
      precipType: "sleet",
      temperature: 66.34,
      humidity: .9,
      windSpeed: 2.15,
      windBearing: 345,
      visibility: 4,
      cloudCover: 0.8,
    };

    const conditionPayload = {
      type: 'slippery',
      vin: vin,
      lat: lat,
      lng: lng,
      geohash: geohash,
      headingDirection: headingDirection,
      headingDegree: headingDegree,
      proximityRadius: 1, //km
      occurrence: 1,
    };
    const condition = new Condition(conditionPayload);
    // check if geohash in the area exists, if it does, then update
    condition.save((err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error persistence' });
      }
      return res.json(result);
    }); */
  // } else {
    return res.json({success: 'true'});
  // }
});

module.exports = router;
