var express = require('express');
var router = express.Router();
const Vehicle = require('../models/Vehicle.js');

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

router.get('/', function(req, res, next) {
  // const vehicleId = req.params.vehicleId;
  mojio_client.authorize('infinitone',',Ms6NxVKB2ePMM').then(function(result,err){
      if (typeof(err) != "undefined") {
        console.log(err);
        return res.status(500).json({ error: 'Error with auth' });
      }
      console.log(req.protocol + '://' + req.get('host'));
      const base_url = 'https://' + req.get('host');

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
  console.log(req.body);
  return res.json({'success':true});
});

module.exports = router;
