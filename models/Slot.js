const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  service_id: { 
    type: String, 
    required: true 
  },
  date: { 
    type: String, 
    required: true 
  },
  time_slot: { 
    type: String, 
    required: true 
  },
  is_booked: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

slotSchema.index({ service_id: 1, date: 1, is_booked: 1 });

module.exports = mongoose.model('Slot', slotSchema);
