const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vin: String,
  lat: Number,
  lng: Number,
  geohash: String,
  speed: Number,
  headingDirection: String,
  headingDegree: Number,
}, { timestamps: true });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
