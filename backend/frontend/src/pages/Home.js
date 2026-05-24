import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSignInAlt, FaUserPlus, FaQrcode, FaRobot, FaHeartbeat, FaMapMarkerAlt } from 'react-icons/fa';
import '../App.css';
import Login from '../pages/Login';

export default function Home() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 12 }
    }
  };

  return (
    <div className="main-container">
      <div className={loginOpen ? 'page-content blurred' : 'page-content'}>
        <section className="hero">
          <div
            className="hero-bg"
            style={{
              backgroundImage: "url('/Gemini_Generated_Image_sno6nusno6nusno6.png')",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center',
              backgroundSize: 'cover',
              filter: 'blur(8px) saturate(100%) contrast(1.05)',
              opacity: 0.75
            }}
          />

          <div className="hero-inner">
            <motion.div className="hero-content" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
              <motion.p className="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.2 }}>
                Smart Care for Every Paw<br />Because Every Pet Deserves Smart Protection<br /><br />
              </motion.p>

              <motion.p className="description" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.4 }}>
                Your pet deserves more than just love — they deserve protection, intelligence, and smart care.
                <br /><br />Our platform combines advanced AI breed detection, secure digital pet profiles, QR-based safety collars,
                lost pet recovery, medical tracking, and community support — all in one powerful ecosystem.
                <br /><br />Whether you're a responsible pet parent, community feeder, or rescue volunteer, we help you keep
                pets safe, healthy, and connected.
              </motion.p>
            </motion.div>

            <div className="right-stack">
              <div className="title-container">
                <motion.h1 className="side-title" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.25 }}>
                  🐾 FurCare 🐾
                </motion.h1>
              </div>

              <motion.div className="right-card" initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 1, delay: 0.3 }} whileHover={{ y: -8 }}>
                <div className="pet-faces">
                  <motion.div className="pet-face" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.8 }} whileHover={{ scale: 1.15, rotate: 10 }}>
                    🐶
                  </motion.div>
                  <motion.div className="pet-face" initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1 }} whileHover={{ scale: 1.15, rotate: -10 }}>
                    🐱
                  </motion.div>
                </div>

                <motion.h4 className="card-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>Get Started</motion.h4>

                <motion.div className="card-buttons" variants={containerVariants} initial="hidden" animate="visible">
                  <motion.button className="btn login" variants={itemVariants} onClick={() => setLoginOpen(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <FaSignInAlt /> Login
                  </motion.button>
                  <motion.button className="btn register" variants={itemVariants} onClick={() => navigate('/upload')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <FaUserPlus /> Register
                  </motion.button>
                  <motion.button className="btn qr" variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/dashboard?nav=lost')}>
                    <FaMapMarkerAlt /> Lost Pets
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="features">
          <motion.h2 className="feature-heading" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8 }}>
            What Makes Us Special
          </motion.h2>

          <motion.div className="feature-grid" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -12, scale: 1.02 }}>
              <motion.div whileHover={{ scale: 1.15, rotateY: 360, transition: { duration: 0.6 } }}>
                <FaRobot className="feature-icon teal" />
              </motion.div>
              <h3>AI Breed Recognition</h3>
              <p>Upload 3–5 images and our AI accurately identifies your pet's breed with high confidence.</p>
            </motion.div>

            <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -12, scale: 1.02 }}>
              <motion.div whileHover={{ scale: 1.15, rotateY: 360, transition: { duration: 0.6 } }}>
                <FaQrcode className="feature-icon peach" />
              </motion.div>
              <h3>Smart QR Identity</h3>
              <p>Generate a unique QR code for your pet. If scanned, the finder sees the profile instantly.</p>
            </motion.div>

            <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -12, scale: 1.02 }}>
              <motion.div whileHover={{ scale: 1.15, rotateY: 360, transition: { duration: 0.6 } }}>
                <FaMapMarkerAlt className="feature-icon olive" />
              </motion.div>
              <h3>Lost Mode Tracking</h3>
              <p>Owner receives real-time location when someone scans the pet's QR during lost situations.</p>
            </motion.div>

            <motion.div className="feature-card" variants={itemVariants} whileHover={{ y: -12, scale: 1.02 }}>
              <motion.div whileHover={{ scale: 1.15, rotateY: 360, transition: { duration: 0.6 } }}>
                <FaHeartbeat className="feature-icon mint" />
              </motion.div>
              <h3>Personalised Care</h3>
              <p>Store Breed information, Diet plans, Caring Tips and Personalised Chatbot.</p>
            </motion.div>
          </motion.div>
        </section>
      </div>

      {loginOpen && <Login onClose={() => setLoginOpen(false)} modal={true} />}
    </div>
  );
}
