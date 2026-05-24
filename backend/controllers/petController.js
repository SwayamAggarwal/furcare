const Pet = require("../models/Pet");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function saveBase64Image(dataUrl, prefix = "img") {
  return new Promise((resolve, reject) => {
    if (!dataUrl) return resolve(undefined);
    // dataUrl may be like: data:image/png;base64,....
    const matches = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    let ext = "png";
    let base64Data = dataUrl;
    if (matches) {
      const mime = matches[1];
      base64Data = matches[2];
      ext = mime.split("/")[1];
    } else if (dataUrl.startsWith("/9j/")) {
      // jpeg base64 without header (unlikely) - default to jpg
      ext = "jpg";
    }

    const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFile(filepath, buffer, (err) => {
      if (err) return reject(err);
      resolve(filename);
    });
  });
}

exports.registerPet = async (req, res) => {
  try {
    console.log('RegisterPet called with body keys:', Object.keys(req.body));

    // Basic validation: require all key fields (including weight)
    const required = ["name", "animal", "breed", "age", "weight", "gender", "ownerName", "ownerPhone", "ownerAddress", "ownerAge", "ownerGender"];
    for (const k of required) {
      if (!req.body || typeof req.body[k] === 'undefined' || req.body[k] === null || req.body[k] === '') {
        return res.status(400).json({ error: `Missing required field: ${k}` });
      }
    }

    // Type validation
    if (!/^\d+$/.test(String(req.body.ownerPhone).trim())) {
      return res.status(400).json({ error: 'ownerPhone must be an integer (digits only)' });
    }
    if (!Number.isInteger(Number(req.body.age))) {
      return res.status(400).json({ error: 'age must be an integer' });
    }
    if (!Number.isInteger(Number(req.body.ownerAge))) {
      return res.status(400).json({ error: 'ownerAge must be an integer' });
    }

    // Weight must be a number (allow integers or floats, e.g., 4.5 kg)
    if (typeof req.body.weight === 'undefined' || req.body.weight === null || String(req.body.weight).trim() === '') {
      return res.status(400).json({ error: 'Missing required field: weight' });
    }
    const w = Number(req.body.weight);
    if (Number.isNaN(w)) {
      return res.status(400).json({ error: 'weight must be a number' });
    }

    // coerce numeric fields to proper types
    const toCreate = { ...req.body };
    toCreate.ownerPhone = Number(String(req.body.ownerPhone).trim());
    toCreate.age = Number(req.body.age);
    toCreate.ownerAge = Number(req.body.ownerAge);
    // coerce and store weight
    toCreate.weight = Number(req.body.weight);

    // If owner supplied a password, create or update a User and attach ownerId
    if (req.body.ownerPassword) {
      const pw = String(req.body.ownerPassword || "");
      if (pw.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      // try to find user by phone
      let user = null;
      try {
        if (toCreate.ownerPhone) {
          user = await User.findOne({ phone: toCreate.ownerPhone });
        }
        const hashed = await bcrypt.hash(pw, 10);
        if (!user) {
          user = await User.create({
            name: toCreate.ownerName,
            phone: toCreate.ownerPhone,
            address: toCreate.ownerAddress,
            age: toCreate.ownerAge,
            gender: toCreate.ownerGender,
            password: hashed
          });
          console.log('Created user for ownerPhone:', toCreate.ownerPhone, 'userId:', user._id.toString());
        } else {
          user.password = hashed;
          user.name = toCreate.ownerName || user.name;
          user.address = toCreate.ownerAddress || user.address;
          user.age = toCreate.ownerAge || user.age;
          user.gender = toCreate.ownerGender || user.gender;
          await user.save();
          console.log('Updated user password for userId:', user._id.toString());
        }
        // store hashed password on pet record as well (so owner details include hashed password)
        toCreate.ownerPasswordHash = hashed;
        toCreate.ownerId = user._id;
        console.log('Prepared to save pet with ownerPasswordHash present:', !!toCreate.ownerPasswordHash);
      } catch (uErr) {
        console.error('User creation/update failed:', uErr && uErr.message ? uErr.message : uErr);
        return res.status(500).json({ error: 'Failed to create owner account' });
      }
    }
    // If frontend sent base64 images (ownerPhoto, petPhoto, petPhotos), save them to disk and replace with URLs

    // handle single ownerPhoto
    if (req.body.ownerPhoto) {
      try {
        const saved = await saveBase64Image(req.body.ownerPhoto, "owner");
        if (saved) toCreate.ownerPhoto = `${req.protocol}://${req.get('host')}/uploads/${saved}`;
      } catch (e) { console.error('ownerPhoto save failed', e && e.message ? e.message : e); }
    }

    // handle single petPhoto
    if (req.body.petPhoto) {
      try {
        const saved = await saveBase64Image(req.body.petPhoto, "pet");
        if (saved) toCreate.petPhoto = `${req.protocol}://${req.get('host')}/uploads/${saved}`;
      } catch (e) { console.error('petPhoto save failed', e && e.message ? e.message : e); }
    }

    // handle array of petPhotos
    if (req.body.petPhotos && Array.isArray(req.body.petPhotos)) {
      const urls = [];
      for (let i = 0; i < req.body.petPhotos.length; i++) {
        try {
          const saved = await saveBase64Image(req.body.petPhotos[i], `pet-${i}`);
          if (saved) urls.push(`${req.protocol}://${req.get('host')}/uploads/${saved}`);
        } catch (e) { console.error(`petPhotos[${i}] save failed`, e && e.message ? e.message : e); }
      }
      if (urls.length) toCreate.petPhotos = urls;
    }

    // remove any raw ownerPassword before saving pet record
    if (toCreate.ownerPassword) delete toCreate.ownerPassword;
    // Create pet document
    const pet = await Pet.create(toCreate);

    // Generate QR containing simple text: Pet name, owner name, owner phone
    try {
      const petObj = pet.toObject ? pet.toObject() : pet;
      function safe(v) { return (v === null || typeof v === 'undefined') ? '' : String(v); }
      const petName = safe(petObj.name);
      const ownerName = safe(petObj.ownerName);
      const ownerPhone = safe(petObj.ownerPhone);
      const qrText = `Pet: ${petName}, Owner: ${ownerName}, Phone: ${ownerPhone}`;
      const qr = await QRCode.toDataURL(qrText);
      pet.qrCode = qr;
      // optionally store plain text for quick access (ignored if schema is strict)
      try { pet.qrText = qrText; } catch (e) { /* ignore */ }
      await pet.save();
    } catch (qrErr) {
      console.error('QR generation failed:', qrErr && qrErr.message ? qrErr.message : qrErr);
      // continue without blocking registration
    }

    console.log('Pet saved:', pet._id, 'ownerPasswordHash present on pet:', !!pet.ownerPasswordHash, 'ownerId:', pet.ownerId);
    res.json(pet);
  } catch (err) {
    console.error('registerPet error:', err && err.message ? err.message : err, err && err.stack ? err.stack : '');
    res.status(500).json({ error: 'Failed to register pet' });
  }
};

exports.getPetsByOwner = async (req, res) => {
  try {
    const phoneParam = req.params.phone;
    if (!phoneParam) return res.status(400).json({ error: 'phone required' });
    const phone = Number(String(phoneParam).trim());
    if (Number.isNaN(phone)) return res.status(400).json({ error: 'phone must be numeric' });
    const pets = await Pet.find({ ownerPhone: phone }).sort({ createdAt: -1 });
    res.json({ pets });
  } catch (err) {
    console.error('getPetsByOwner error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.setLostStatus = async (req, res) => {
  try {
    const petId = req.params.id;
    if (!petId) return res.status(400).json({ error: 'pet id required' });
    const isLost = !!req.body.isLost;
    const location = req.body.location;

    const update = { isLost };
    if (isLost && location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      update.lostLocation = { lat: location.lat, lng: location.lng, at: new Date() };
    } else if (!isLost) {
      // clear lostLocation when pet is found
      update.lostLocation = undefined;
    }

    const pet = await Pet.findByIdAndUpdate(petId, update, { new: true });
    if (!pet) return res.status(404).json({ error: 'pet not found' });
    res.json({ pet });
  } catch (err) {
    console.error('setLostStatus error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Server error' });
  }
};
