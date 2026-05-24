import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { predictPet, registerPet } from "../api";
import "./upload.css";

function Upload() {
  // Helper to strip numeric prefix like `n02085782-` and replace underscores with spaces
  function formatBreed(b) {
    if (!b && b !== 0) return b;
    const s = String(b);
    const dashIndex = s.indexOf('-');
    if (dashIndex > 0 && /^n\d+$/.test(s.substring(0, dashIndex))) {
      return s.substring(dashIndex + 1).replace(/_/g, ' ');
    }
    return s.replace(/_/g, ' ');
  }
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [breedOther, setBreedOther] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regResult, setRegResult] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: "", animal: "", breed: "", age: "", weight: "", gender: "", ownerPassword: "",
    ownerName: "", ownerPhone: "", ownerAddress: "", ownerAge: "", ownerGender: "",
    allergies: ""
  });
  const [ownerPhotoFile, setOwnerPhotoFile] = useState(null);
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState(null);
  const [petPhotoFile, setPetPhotoFile] = useState(null);
  const [petPhotoPreview, setPetPhotoPreview] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const p = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setPreviews(p);
    return () => p.forEach((x) => x.url && URL.revokeObjectURL(x.url));
  }, [files]);

  const onFiles = (incoming) => {
    const arr = Array.from(incoming).slice(0, 8);
    setFiles((prev) => [...prev, ...arr]);
  };

  const handleDrop = (e) => { 
    e.preventDefault(); 
    setDragActive(false);
    onFiles(e.dataTransfer.files); 
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleSelect = (e) => onFiles(e.target.files);
  const removeIndex = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const runPrediction = async () => {
    setError(null);
    setPrediction(null);
    setAnalyzed(true);
    if (files.length === 0) { 
      setError("Please add images first."); 
      setAnalyzed(false); 
      return; 
    }

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      setLoading(true);
      const res = await predictPet(formData);
      setPrediction(res.data);
      setShowOwnerForm(true);
      setForm((s) => ({ 
        ...s, 
        animal: res.data.animal || s.animal, 
        breed: res.data.breed || s.breed 
      }));
    } catch (err) {
      console.error(err?.response?.data || err.message);
      setError("Prediction failed. Check server logs.");
      setAnalyzed(false);
    } finally { 
      setLoading(false); 
    }
  };

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleOwnerPhotoSelect = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setOwnerPhotoFile(f);
      setOwnerPhotoPreview(URL.createObjectURL(f));
    }
  };

  const handlePetPhotoSelect = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setPetPhotoFile(f);
      setPetPhotoPreview(URL.createObjectURL(f));
    }
  };

  const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const handleRegister = async (breedSource = "manual") => {
    setError(null);
    const required = ["name", "animal", "breed", "age", "weight", "gender", "ownerName", "ownerPhone", "ownerAddress", "ownerAge", "ownerGender", "ownerPassword"];
    for (const k of required) {
      if (!form[k] && form[k] !== 0) {
        setError("All fields are required. Please fill " + k + ".");
        return;
      }
    }
    if (!ownerPhotoFile) {
      setError("Owner photo is required.");
      return;
    }
    if (!petPhotoFile) {
      setError("Pet photo is required.");
      return;
    }
    if (!/^\d+$/.test(String(form.ownerPhone).trim())) {
      setError("Owner phone must be number only.");
      return;
    }
    if (!/^\d+$/.test(String(form.age).trim())) {
      setError("Pet age must be a whole number.");
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(String(form.weight).trim())) {
      setError("Pet weight must be a number (e.g. 4.5).");
      return;
    }
    if (!/^\d+$/.test(String(form.ownerAge).trim())) {
      setError("Owner age must be a number.");
      return;
    }
    if (!form.ownerPassword || String(form.ownerPassword).length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    try {
      const ownerPhotoData = ownerPhotoFile ? await readFileAsDataURL(ownerPhotoFile) : undefined;
      const petPhotoData = petPhotoFile ? await readFileAsDataURL(petPhotoFile) : undefined;
      const petPhotosData = files && files.length > 0 ? await Promise.all(files.map((f) => readFileAsDataURL(f))) : undefined;

      // prepare allergies array if provided (optional)
      let allergiesArr = undefined;
      if (form.allergies && String(form.allergies).trim() !== "") {
        allergiesArr = String(form.allergies).split(',').map(s => s.trim()).filter(Boolean);
      }

      const payload = {
        name: form.name,
        animal: form.animal,
        breed: form.breed,
        age: parseInt(form.age, 10),
        weight: form.weight ? parseFloat(form.weight) : undefined,
        gender: form.gender,
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        ownerAddress: form.ownerAddress,
        ownerPassword: form.ownerPassword,
        ownerAge: parseInt(form.ownerAge, 10),
        ownerGender: form.ownerGender,
        ownerPhoto: ownerPhotoData,
        petPhoto: petPhotoData,
        petPhotos: petPhotosData,
        breedSource,
        allergies: allergiesArr
      };

      const res = await registerPet(payload);
      setRegResult(res.data);
      setShowSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #F3F3F3 0%, #fafafa 100%)',
      padding: '60px 20px',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative'
    }}>
      {/* Subtle pattern overlay */}
      <div className="pattern-dots" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        opacity: 0.5
      }} />

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 60,
          animation: 'fadeIn 0.6s ease'
        }}>
          <h1 style={{
            fontSize: 56,
            fontWeight: 900,
            color: '#302f4d',
            marginBottom: 20,
            letterSpacing: '-2.5px',
            fontFamily: "'Merriweather', serif",
            lineHeight: 1.1
          }}>
            Pet Registration System
          </h1>
          <div className="section-divider" style={{ width: 140, margin: '24px auto' }} />
          <p style={{
            fontSize: 18,
            color: '#6b6b75',
            fontWeight: 400,
            letterSpacing: '0.3px',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.7
          }}>
            Advanced AI-powered pet identification and secure registration
          </p>
        </div>

        {/* Main Card */}
        <div className="card-entrance" style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: 48,
          boxShadow: '0 20px 60px rgba(48, 47, 77, 0.08), 0 1px 3px rgba(48, 47, 77, 0.06)',
          border: '1px solid rgba(48, 47, 77, 0.04)',
        }}>
          {!analyzed && (
            <>
              <div 
                className={dragActive ? 'drop-zone-active' : ''}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(48, 47, 77, 0.15)',
                  borderRadius: 20,
                  padding: 64,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.02), rgba(236, 72, 153, 0.02))',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  animation: 'float 3.5s ease-in-out infinite',
                }}>
                  {/* Modern upload icon container */}
                  <div style={{
                    width: 80,
                    height: 80,
                    margin: '0 auto 20px',
                    background: 'linear-gradient(135deg, #302f4d, #6b6a8f)',
                    borderRadius: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(48, 47, 77, 0.2)',
                    position: 'relative'
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {/* Floating badge */}
                    <div style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      background: 'linear-gradient(135deg, #a57982, #e9c7c9)',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid #ffffff',
                      boxShadow: '0 4px 12px rgba(165, 121, 130, 0.3)'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  </div>

                  <h3 style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#302f4d',
                    marginBottom: 10,
                    letterSpacing: '-0.6px'
                  }}>
                    Upload Pet Images
                  </h3>
                  
                  <p style={{
                    fontSize: 15,
                    color: '#6b6b75',
                    fontWeight: 500,
                    lineHeight: 1.6,
                    marginBottom: 16,
                    maxWidth: 400,
                    margin: '0 auto 16px'
                  }}>
                    Drag and drop your pet photos or{' '}
                    <span style={{
                      color: '#6b6a8f',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      textDecorationThickness: '2px',
                      textUnderlineOffset: '3px'
                    }}>
                      browse files
                    </span>
                  </p>

                  {/* File info badges */}
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      background: 'rgba(107, 106, 143, 0.08)',
                      borderRadius: 20,
                      border: '1px solid rgba(107, 106, 143, 0.15)'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6a8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span style={{
                        fontSize: 13,
                        color: '#6b6a8f',
                        fontWeight: 600
                      }}>
                        Up to 8 images
                      </span>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      background: 'rgba(107, 106, 143, 0.08)',
                      borderRadius: 20,
                      border: '1px solid rgba(107, 106, 143, 0.15)'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6a8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      <span style={{
                        fontSize: 13,
                        color: '#6b6a8f',
                        fontWeight: 600
                      }}>
                        JPG, PNG, WebP
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {previews.length > 0 && (
                <div style={{ marginTop: 40 }} className="fade-in-scale">
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24
                  }}>
                    <h4 style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#120d31',
                      letterSpacing: '-0.4px'
                    }}>
                      Selected Images
                    </h4>
                    <span style={{
                      background: 'linear-gradient(135deg, #302f4d, #6b6a8f)',
                      color: '#ffffff',
                      padding: '6px 18px',
                      borderRadius: 16,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '0.3px'
                    }}>
                      {previews.length} / 8
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 20,
                  }}>
                    {previews.map((p, i) => (
                      <div key={i} style={{
                        position: 'relative',
                        animation: `fadeIn 0.5s ease ${i * 0.1}s backwards`
                      }}>
                        <img
                          src={p.url}
                          alt={p.name}
                          className="thumbnail-hover"
                          style={{
                            width: '100%',
                            height: 150,
                            borderRadius: 14,
                            objectFit: 'cover',
                            boxShadow: '0 8px 20px rgba(48, 47, 77, 0.1)',
                            border: '2px solid rgba(48, 47, 77, 0.05)'
                          }}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeIndex(i); }}
                          className="btn-modern"
                          style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'linear-gradient(135deg, #a57982, #c7989f)',
                            color: '#ffffff',
                            fontSize: 18,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(165, 121, 130, 0.35)',
                            fontWeight: 600
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <button
                  onClick={runPrediction}
                  disabled={loading}
                  className="btn-modern glow-effect"
                  style={{
                    marginTop: 40,
                    width: '100%',
                    padding: '18px 36px',
                    borderRadius: 14,
                    border: 'none',
                    background: loading 
                      ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                      : 'linear-gradient(135deg, #302f4d, #6b6a8f)',
                    color: '#ffffff',
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(48, 47, 77, 0.25)',
                    letterSpacing: '0.3px',
                    position: 'relative',
                  }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <span className="spinner" style={{
                        width: 20,
                        height: 20,
                        border: '2.5px solid rgba(255, 255, 255, 0.25)',
                        borderTop: '2.5px solid #ffffff',
                        borderRadius: '50%',
                        display: 'inline-block'
                      }}></span>
                      <span className="loading-dots">Analyzing Images</span>
                    </span>
                  ) : (
                    'Analyze & Predict'
                  )}
                </button>
              )}
            </>
          )}

          {error && (
            <div className="fade-in-scale" style={{
              marginTop: 24,
              padding: 18,
              borderRadius: 14,
              background: 'rgba(165, 121, 130, 0.06)',
              border: '1px solid rgba(165, 121, 130, 0.2)',
              color: '#a57982',
              fontWeight: 600,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {prediction && (
            <div className="prediction-badge" style={{
              marginTop: 40,
              padding: 36,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(236, 72, 153, 0.03))',
              borderRadius: 20,
              border: '1px solid rgba(48, 47, 77, 0.06)',
              boxShadow: '0 12px 32px rgba(48, 47, 77, 0.06)',
              animation: 'fadeIn 0.6s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginBottom: 32,
                paddingBottom: 28,
                borderBottom: '1px solid rgba(48, 47, 77, 0.06)'
              }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #302f4d, #6b6a8f)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(48, 47, 77, 0.2)',
                  animation: 'smoothPulse 2.5s ease-in-out infinite'
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13,
                    color: '#6b6a8f',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    marginBottom: 8
                  }}>
                    AI Detection Complete
                  </div>
                  <div style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: '#120d31',
                    letterSpacing: '-1.2px',
                    fontFamily: "'Merriweather', serif"
                  }}>
                    {prediction.animal}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#ffffff',
                padding: 26,
                borderRadius: 16,
                marginBottom: 24,
                border: '1px solid rgba(48, 47, 77, 0.05)',
                boxShadow: '0 4px 16px rgba(48, 47, 77, 0.04)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14
                }}>
                  <span style={{ 
                    fontWeight: 700, 
                    color: '#120d31', 
                    fontSize: 17,
                    letterSpacing: '-0.3px'
                  }}>
                    Primary Breed
                  </span>
                  <span style={{
                    background: 'linear-gradient(135deg, #302f4d, #6b6a8f)',
                    color: '#ffffff',
                    padding: '7px 18px',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: '0.3px'
                  }}>
                    {(prediction.confidence * 100).toFixed(1)}% Match
                  </span>
                </div>
                <div style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#302f4d',
                  letterSpacing: '-0.5px'
                }}>
                  {formatBreed(prediction.breed)}
                </div>
              </div>

              {prediction.top3 && prediction.top3.length > 0 && (
                <div>
                  <h4 style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: '#302f4d',
                    marginBottom: 18,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                  }}>
                    Top 3 Possible Matches
                  </h4>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {prediction.top3.map((t, idx) => (
                      <div
                        key={idx}
                        className="form-field"
                        style={{
                          background: '#ffffff',
                          padding: 18,
                          borderRadius: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid rgba(48, 47, 77, 0.05)',
                          animationDelay: `${idx * 0.08}s`,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateX(6px)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(48, 47, 77, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14
                        }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: idx === 0 
                              ? 'linear-gradient(135deg, #625834, #bcae86)'
                              : idx === 1
                              ? 'linear-gradient(135deg, #a57982, #e9c7c9)'
                              : 'linear-gradient(135deg, #6b6a8f, #302f4d)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            color: '#ffffff',
                            fontSize: 15,
                            boxShadow: '0 4px 12px rgba(48, 47, 77, 0.12)'
                          }}>
                            {idx + 1}
                          </div>
                          <span style={{
                            fontWeight: 700,
                            color: '#120d31',
                            fontSize: 17,
                            letterSpacing: '-0.2px'
                          }}>
                            {formatBreed(t.breed)}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 800,
                          color: '#302f4d',
                          fontSize: 16,
                          letterSpacing: '0.2px'
                        }}>
                          {(t.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showOwnerForm && (
                <div style={{
                  marginTop: 36,
                  padding: 36,
                  borderRadius: 18,
                  background: '#ffffff',
                  border: '1px solid rgba(48, 47, 77, 0.05)',
                  animation: 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: '0 8px 24px rgba(48, 47, 77, 0.06)'
                }}>
                  <h3 style={{
                    fontSize: 26,
                    fontWeight: 900,
                    marginBottom: 10,
                    color: '#120d31',
                    letterSpacing: '-0.8px',
                    fontFamily: "'Merriweather', serif"
                  }}>
                    Complete Registration
                  </h3>
                  <p style={{
                    fontSize: 15,
                    color: '#6b6b75',
                    marginBottom: 28,
                    lineHeight: 1.6
                  }}>
                    Fill in all required information to finalize the pet registration
                  </p>
                  <div className="section-divider" style={{ marginBottom: 28 }} />

                  <div style={{ display: 'grid', gap: 24 }}>
                    {/* Pet Details Section */}
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.03)',
                      padding: 24,
                      borderRadius: 14,
                      border: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <h4 style={{
                        fontSize: 16,
                        fontWeight: 800,
                        marginBottom: 20,
                        color: '#302f4d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        <div style={{
                          width: 4,
                          height: 20,
                          background: 'linear-gradient(135deg, #302f4d, #6b6a8f)',
                          borderRadius: 2
                        }} />
                        Pet Information
                      </h4>
                      
                      <div style={{ display: 'grid', gap: 18 }}>
                        <div className="form-field" style={{ animationDelay: '0s' }}>
                          <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 8,
                            color: '#120d31',
                            letterSpacing: '0.2px'
                          }}>
                            Pet Name <span style={{ color: '#a57982' }}>*</span>
                          </label>
                          <input
                            name="name"
                            value={form.name}
                            onChange={handleFormChange}
                            className="input-modern"
                            style={{
                              width: '100%',
                              padding: '13px 16px',
                              borderRadius: 10,
                              border: '1px solid rgba(48, 47, 77, 0.1)',
                              fontSize: 15,
                              fontWeight: 500,
                              outline: 'none',
                              fontFamily: "'Outfit', sans-serif",
                              background: '#ffffff',
                              color: '#120d31'
                            }}
                            placeholder="Enter pet's name"
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                          <div className="form-field" style={{ animationDelay: '0.08s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Animal Type <span style={{ color: '#a57982' }}>*</span>
                            </label>
                            <input
                              name="animal"
                              value={form.animal}
                              onChange={handleFormChange}
                              className="input-modern"
                              style={{
                                width: '100%',
                                padding: '13px 16px',
                                borderRadius: 10,
                                border: '1px solid rgba(48, 47, 77, 0.1)',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                background: '#ffffff',
                                color: '#120d31'
                              }}
                              placeholder="e.g., Dog, Cat"
                            />
                          </div>

                          <div className="form-field" style={{ animationDelay: '0.16s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Breed <span style={{ color: '#a57982' }}>*</span>
                            </label>
                            {!breedOther ? (
                              <select
                                name="breedSelect"
                                value={form.breed || (prediction?.breed || "")}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "Other") {
                                    setBreedOther(true);
                                    setForm({ ...form, breed: "" });
                                  } else {
                                    setBreedOther(false);
                                    setForm({ ...form, breed: v });
                                  }
                                }}
                                className="input-modern"
                                style={{
                                  width: '100%',
                                  padding: '13px 16px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(48, 47, 77, 0.1)',
                                  fontSize: 15,
                                  fontWeight: 500,
                                  outline: 'none',
                                  fontFamily: "'Outfit', sans-serif",
                                  cursor: 'pointer',
                                  background: '#ffffff',
                                  color: '#120d31'
                                }}
                              >
                                <option value="">{prediction?.breed ? formatBreed(prediction.breed) : 'Select breed'}</option>
                                {prediction?.top3 && prediction.top3.map((t, i) => (
                                  <option key={i} value={t.breed}>{formatBreed(t.breed)}</option>
                                ))}
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <input
                                name="breed"
                                value={form.breed}
                                onChange={handleFormChange}
                                className="input-modern"
                                style={{
                                  width: '100%',
                                  padding: '13px 16px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(48, 47, 77, 0.1)',
                                  fontSize: 15,
                                  fontWeight: 500,
                                  outline: 'none',
                                  fontFamily: "'Outfit', sans-serif",
                                  background: '#ffffff',
                                  color: '#120d31'
                                }}
                                placeholder="Enter breed manually"
                              />
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
                          <div className="form-field" style={{ animationDelay: '0.24s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Age (years) <span style={{ color: '#a57982' }}>*</span>
                            </label>
                            <input
                              name="age"
                              value={form.age}
                              onChange={handleFormChange}
                              className="input-modern"
                              type="number"
                              style={{
                                width: '100%',
                                padding: '13px 16px',
                                borderRadius: 10,
                                border: '1px solid rgba(48, 47, 77, 0.1)',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                background: '#ffffff',
                                color: '#120d31'
                              }}
                              placeholder="Pet's age"
                            />
                          </div>

                          <div className="form-field" style={{ animationDelay: '0.28s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Weight (kg)
                            </label>
                            <input
                              name="weight"
                              value={form.weight}
                              onChange={handleFormChange}
                              className="input-modern"
                              type="number"
                              step="0.1"
                              style={{
                                width: '100%',
                                padding: '13px 16px',
                                borderRadius: 10,
                                border: '1px solid rgba(48, 47, 77, 0.1)',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                background: '#ffffff',
                                color: '#120d31'
                              }}
                              placeholder="Weight (kg)"
                            />
                          </div>

                          <div className="form-field" style={{ animationDelay: '0.32s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Gender <span style={{ color: '#a57982' }}>*</span>
                            </label>
                            <select
                              name="gender"
                              value={form.gender}
                              onChange={handleFormChange}
                              className="input-modern"
                              style={{
                                width: '100%',
                                padding: '13px 16px',
                                borderRadius: 10,
                                border: '1px solid rgba(48, 47, 77, 0.1)',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                cursor: 'pointer',
                                background: '#ffffff',
                                color: '#120d31'
                              }}
                            >
                              <option value="">Select gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-field" style={{ animationDelay: '0.36s' }}>
                          <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 8,
                            color: '#120d31',
                            letterSpacing: '0.2px'
                          }}>
                            Allergies (optional)
                          </label>
                          <input
                            name="allergies"
                            value={form.allergies}
                            onChange={handleFormChange}
                            className="input-modern"
                            style={{
                              width: '100%',
                              padding: '13px 16px',
                              borderRadius: 10,
                              border: '1px solid rgba(48, 47, 77, 0.1)',
                              fontSize: 15,
                              fontWeight: 500,
                              outline: 'none',
                              fontFamily: "'Outfit', sans-serif",
                              background: '#ffffff',
                              color: '#120d31'
                            }}
                            placeholder="e.g., pollen, chicken (comma-separated)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Owner Details Section */}
                    <div style={{
                      background: 'rgba(236, 72, 153, 0.03)',
                      padding: 24,
                      borderRadius: 14,
                      border: '1px solid rgba(165, 121, 130, 0.15)'
                    }}>
                      <h4 style={{
                        fontSize: 16,
                        fontWeight: 800,
                        marginBottom: 20,
                        color: '#a57982',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        <div style={{
                          width: 4,
                          height: 20,
                          background: 'linear-gradient(135deg, #a57982, #e9c7c9)',
                          borderRadius: 2
                        }} />
                        Owner Information
                      </h4>

                      <div style={{ display: 'grid', gap: 18 }}>
                        <div className="form-field" style={{ animationDelay: '0.4s' }}>
                          <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 8,
                            color: '#120d31',
                            letterSpacing: '0.2px'
                          }}>
                            Owner Name <span style={{ color: '#a57982' }}>*</span>
                          </label>
                          <input
                            name="ownerName"
                            value={form.ownerName}
                            onChange={handleFormChange}
                            className="input-modern"
                            style={{
                              width: '100%',
                              padding: '13px 16px',
                              borderRadius: 10,
                              border: '1px solid rgba(165, 121, 130, 0.15)',
                              fontSize: 15,
                              fontWeight: 500,
                              outline: 'none',
                              fontFamily: "'Outfit', sans-serif",
                              background: '#ffffff',
                              color: '#120d31'
                            }}
                            placeholder="Full name"
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                          <div className="form-field" style={{ animationDelay: '0.48s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Phone Number <span style={{ color: '#a57982' }}>*</span>
                            </label>
                            <input
                              name="ownerPhone"
                              value={form.ownerPhone}
                              onChange={handleFormChange}
                              className="input-modern"
                              style={{
                                width: '100%',
                                padding: '13px 16px',
                                borderRadius: 10,
                                border: '1px solid rgba(165, 121, 130, 0.15)',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                background: '#ffffff',
                                color: '#120d31'
                              }}
                              placeholder="Contact number"
                            />
                          </div>

                          <div className="form-field" style={{ animationDelay: '0.56s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Age <span style={{ color: '#a57982' }}>*</span>
                            </label>
                            <input
                              name="ownerAge"
                              value={form.ownerAge}
                              onChange={handleFormChange}
                              className="input-modern"
                              type="number"
                              style={{
                                width: '100%',
                                padding: '13px 16px',
                                borderRadius: 10,
                                border: '1px solid rgba(165, 121, 130, 0.15)',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                background: '#ffffff',
                                color: '#120d31'
                              }}
                              placeholder="Your age"
                            />
                          </div>
                        </div>

                        <div className="form-field" style={{ animationDelay: '0.64s' }}>
                          <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 8,
                            color: '#120d31',
                            letterSpacing: '0.2px'
                          }}>
                            Address <span style={{ color: '#a57982' }}>*</span>
                          </label>
                          <input
                            name="ownerAddress"
                            value={form.ownerAddress}
                            onChange={handleFormChange}
                            className="input-modern"
                            style={{
                              width: '100%',
                              padding: '13px 16px',
                              borderRadius: 10,
                              border: '1px solid rgba(165, 121, 130, 0.15)',
                              fontSize: 15,
                              fontWeight: 500,
                              outline: 'none',
                              fontFamily: "'Outfit', sans-serif",
                              background: '#ffffff',
                              color: '#120d31'
                            }}
                            placeholder="Full address"
                          />
                        </div>

                          <div className="form-field" style={{ animationDelay: '0.72s' }}>
                            <label style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 700,
                              marginBottom: 8,
                              color: '#120d31',
                              letterSpacing: '0.2px'
                            }}>
                              Password <span style={{ color: '#a57982' }}>*</span>
                            </label>
                            <input
                              name="ownerPassword"
                              value={form.ownerPassword}
                              onChange={handleFormChange}
                              type="password"
                              className="input-modern"
                              style={{
                                width: '100%'
                              }}
                              placeholder="Create a password (min 6 chars)"
                            />
                          </div>

                        <div className="form-field" style={{ animationDelay: '0.72s' }}>
                          <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 8,
                            color: '#120d31',
                            letterSpacing: '0.2px'
                          }}>
                            Gender <span style={{ color: '#a57982' }}>*</span>
                          </label>
                          <select
                            name="ownerGender"
                            value={form.ownerGender}
                            onChange={handleFormChange}
                            className="input-modern"
                            style={{
                              width: '100%',
                              padding: '13px 16px',
                              borderRadius: 10,
                              border: '1px solid rgba(165, 121, 130, 0.15)',
                              fontSize: 15,
                              fontWeight: 500,
                              outline: 'none',
                              fontFamily: "'Outfit', sans-serif",
                              cursor: 'pointer',
                              background: '#ffffff',
                              color: '#120d31'
                            }}
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Photo Upload Section */}
                    <div style={{
                      background: 'rgba(20, 184, 166, 0.03)',
                      padding: 24,
                      borderRadius: 14,
                      border: '1px solid rgba(98, 88, 52, 0.12)'
                    }}>
                      <h4 style={{
                        fontSize: 16,
                        fontWeight: 800,
                        marginBottom: 20,
                        color: '#625834',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        <div style={{
                          width: 4,
                          height: 20,
                          background: 'linear-gradient(135deg, #625834, #bcae86)',
                          borderRadius: 2
                        }} />
                        Upload Photos
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-field" style={{ animationDelay: '0.8s' }}>
                          <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 8,
                            color: '#120d31',
                            letterSpacing: '0.2px'
                          }}>
                            Owner Photo <span style={{ color: '#a57982' }}>*</span>
                          </label>
                          <div style={{
                            border: '2px dashed rgba(48, 47, 77, 0.1)',
                            borderRadius: 12,
                            padding: 20,
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: '#ffffff',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            minHeight: 150
                          }}
                          onClick={() => document.getElementById('ownerPhotoInput').click()}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#6b6a8f';
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.02)';
                            e.currentTarget.style.transform = 'scale(1.01)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(48, 47, 77, 0.1)';
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          >
                            {ownerPhotoPreview ? (
                              <img
                                src={ownerPhotoPreview}
                                alt="owner"
                                style={{
                                  width: '100%',
                                  height: 130,
                                  objectFit: 'cover',
                                  borderRadius: 8
                                }}
                              />
                            ) : (
                              <div style={{ color: '#6b6b75', fontSize: 14, fontWeight: 500 }}>
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6b6a8f" strokeWidth="2" style={{ margin: '0 auto 10px' }}>
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                  <circle cx="12" cy="7" r="4"/>
                                </svg>
                                Click to upload
                              </div>
                            )}
                          </div>
                          <input
                            id="ownerPhotoInput"
                            type="file"
                            accept="image/*"
                            onChange={handleOwnerPhotoSelect}
                            style={{ display: 'none' }}
                          />
                        </div>

                        <div className="form-field" style={{ animationDelay: '0.88s' }}>
                          <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 8,
                            color: '#120d31',
                            letterSpacing: '0.2px'
                          }}>
                            Pet Photo <span style={{ color: '#a57982' }}>*</span>
                          </label>
                          <div style={{
                            border: '2px dashed rgba(48, 47, 77, 0.1)',
                            borderRadius: 12,
                            padding: 20,
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: '#ffffff',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            minHeight: 150
                          }}
                          onClick={() => document.getElementById('petPhotoInput').click()}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#6b6a8f';
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.02)';
                            e.currentTarget.style.transform = 'scale(1.01)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(48, 47, 77, 0.1)';
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          >
                            {petPhotoPreview ? (
                              <img
                                src={petPhotoPreview}
                                alt="pet"
                                style={{
                                  width: '100%',
                                  height: 130,
                                  objectFit: 'cover',
                                  borderRadius: 8
                                }}
                              />
                            ) : (
                              <div style={{ color: '#6b6b75', fontSize: 14, fontWeight: 500 }}>
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6b6a8f" strokeWidth="2" style={{ margin: '0 auto 10px' }}>
                                  <circle cx="12" cy="8" r="7"/>
                                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                                </svg>
                                Click to upload
                              </div>
                            )}
                          </div>
                          <input
                            id="petPhotoInput"
                            type="file"
                            accept="image/*"
                            onChange={handlePetPhotoSelect}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRegister("ai")}
                    className="btn-modern glow-effect"
                    style={{
                      marginTop: 32,
                      width: '100%',
                      padding: '18px 36px',
                      borderRadius: 14,
                      border: 'none',
                      background: 'linear-gradient(135deg, #302f4d, #6b6a8f)',
                      color: '#ffffff',
                      fontSize: 18,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(48, 47, 77, 0.25)',
                      letterSpacing: '0.3px'
                    }}
                  >
                    Complete Registration
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && regResult && (
        <div className="success-toast" style={{
          position: 'fixed',
          top: 32,
          right: 32,
          background: '#ffffff',
          padding: 32,
          borderRadius: 20,
          boxShadow: '0 24px 48px rgba(48, 47, 77, 0.18), 0 0 0 1px rgba(48, 47, 77, 0.05)',
          zIndex: 9999,
          maxWidth: 400,
          border: '1px solid rgba(48, 47, 77, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            gap: 20,
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #302f4d, #6b6a8f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation: 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 6px 18px rgba(48, 47, 77, 0.25)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#302f4d',
                marginBottom: 6,
                letterSpacing: '-0.5px'
              }}>
                Registration Successful
              </h3>
              <p style={{
                fontSize: 14,
                color: '#6b6b75',
                marginBottom: 18,
                lineHeight: 1.5
              }}>
                Your pet has been successfully registered
              </p>
              <div style={{
                background: 'rgba(99, 102, 241, 0.05)',
                padding: 14,
                borderRadius: 10,
                marginBottom: 18,
                border: '1px solid rgba(99, 102, 241, 0.1)'
              }}>
                <div style={{
                  fontSize: 11,
                  color: '#6b6a8f',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: 5
                }}>
                  Registration ID
                </div>
                <div style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#302f4d',
                  fontFamily: 'monospace',
                  letterSpacing: '0.3px'
                }}>
                  {regResult._id}
                </div>
              </div>
              {regResult.qrCode && (
                <div style={{
                  background: 'rgba(236, 72, 153, 0.03)',
                  padding: 16,
                  borderRadius: 12,
                  textAlign: 'center',
                  marginBottom: 18,
                  border: '1px solid rgba(236, 72, 153, 0.1)'
                }}>
                  <img
                    src={regResult.qrCode}
                    alt="QR Code"
                    style={{
                      width: 120,
                      height: 120,
                      margin: '0 auto',
                      animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards',
                      borderRadius: 6
                    }}
                  />
                </div>
              )}
              <button
                onClick={() => setShowSuccess(false)}
                className="btn-modern"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid rgba(48, 47, 77, 0.1)',
                  background: '#ffffff',
                  color: '#302f4d',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Upload;