const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  vin: String,
  type: String,
  lat: Number,
  lng: Number,
  geohash: String,
  headingDirection: String,
  headingDegree: Number,
  proximityRadius: Number,
  occurrence: Number
}, { timestamps: true });

const Condition = mongoose.model('Condition', conditionSchema);

module.exports = Condition;
