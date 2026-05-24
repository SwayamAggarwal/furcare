const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'phone and password required' });

    const phoneNum = Number(String(phone).trim());
    if (Number.isNaN(phoneNum)) return res.status(400).json({ error: 'phone must be numeric' });

    const user = await User.findOne({ phone: phoneNum });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(String(password), user.password || '');
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Do not return password hash
    const safeUser = {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      address: user.address,
      age: user.age,
      gender: user.gender
    };

    console.log('Auth success for phone:', phoneNum);
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Login error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Server error' });
  }
};
