import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Bell,
  LogOut,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Wind,
  Zap,
  Armchair,
  Monitor,
  Droplet,
  Wifi,
  Trash,
  Shield,
  MoreHorizontal,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { fetchBuildings, fetchCategories, createReport } from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';
import './reportWizard.css';

// 9 Categories matching Screenshot 1
const CATEGORY_DEFINITIONS = [
  { id: 1, name: 'Air Conditioning', icon: Wind, slug: 'air-conditioning' },
  { id: 2, name: 'Electrical', icon: Zap, slug: 'electrical' },
  { id: 3, name: 'Furniture', icon: Armchair, slug: 'furniture' },
  { id: 4, name: 'Classroom', icon: Monitor, slug: 'classroom' },
  { id: 5, name: 'Restroom', icon: Droplet, slug: 'restroom' },
  { id: 6, name: 'Internet', icon: Wifi, slug: 'internet' },
  { id: 7, name: 'Cleaning', icon: Trash, slug: 'cleaning' },
  { id: 8, name: 'Safety', icon: Shield, slug: 'safety' },
  { id: 9, name: 'Other', icon: MoreHorizontal, slug: 'other' },
];

// Fallback building data matching user specification
const DEFAULT_BUILDINGS = [
  { id: 1, name: 'PTC Building', floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'] },
  { id: 2, name: 'CMA Building', floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'] },
  { id: 3, name: 'NH Building', floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'] },
  { id: 4, name: 'MBA Building', floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'] },
  { id: 5, name: 'RS Building', floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', '6th Floor', '7th Floor', '8th Floor'] },
  { id: 6, name: 'BE Building', floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'] },
  { id: 7, name: 'CCJE Building', floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'] },
  { id: 8, name: 'Library', floors: ['1st Floor', '2nd Floor'] },
  { id: 9, name: 'GYM', floors: ['1st Floor'] },
  { id: 10, name: 'Others', floors: [] },
];

export default function ReportIssueWizard({
  currentUser,
  onNavigate,
  onLogout,
  onReportCreated,
}) {
  // Wizard Step: 1 = Issue, 2 = Location, 3 = Details, 4 = Review
  const [currentStep, setCurrentStep] = useState(1);
  const [unreadCount, setUnreadCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Start Over / Exit Confirmation Modal State
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState(null);
  const isExitingRef = useRef(false);

  const handleRequestExit = (action) => {
    setPendingExitAction(() => action);
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    isExitingRef.current = true;
    setShowExitModal(false);
    const actionToRun = pendingExitAction;
    setPendingExitAction(null);
    if (typeof actionToRun === 'function') {
      actionToRun();
    } else {
      onNavigate('dashboard');
    }
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
    setPendingExitAction(null);
  };

  // Intercept browser back/forward buttons while in report-issue wizard
  useEffect(() => {
    const handlePopState = () => {
      if (isExitingRef.current) return;
      window.history.pushState(null, '', '#report-issue');
      handleRequestExit(() => onNavigate('dashboard'));
    };

    window.history.pushState(null, '', '#report-issue');
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onNavigate]);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_DEFINITIONS[0]); // Default to Air Conditioning
  const [primaryPhoto, setPrimaryPhoto] = useState('/images/hero_ac_defect.jpg'); // Default realistic preview or custom upload
  const [additionalPhotos, setAdditionalPhotos] = useState([
    '/images/classroom_chairs.jpg',
    '/images/faulty_light_switch.jpg',
  ]);

  // Location State
  const [buildings, setBuildings] = useState(DEFAULT_BUILDINGS);
  const [selectedBuilding, setSelectedBuilding] = useState('PTC Building');
  const [selectedFloor, setSelectedFloor] = useState('3rd Floor');
  const [customFloor, setCustomFloor] = useState('');
  const [roomCoordinate, setRoomCoordinate] = useState('PTC 306');

  // Defect Details State
  const [issueTitle, setIssueTitle] = useState('Broken Air Conditioner');
  const [priorityLevel, setPriorityLevel] = useState('High'); // Low, Medium, High, Urgent
  const [description, setDescription] = useState(
    'The wall-mounted AC unit is leaking water heavily and making a loud rattling sound. It does not blow cold air anymore. Water is dripping onto laboratory table 4.'
  );

  const fileInputRef = useRef(null);
  const multiFileInputRef = useRef(null);

  // Fetch live buildings & categories from database on mount
  useEffect(() => {
    fetchBuildings().then((res) => {
      if (res && res.success && res.buildings && res.buildings.length > 0) {
        // Group floors by building
        const mapped = res.buildings.map((b) => {
          const bFloors = (res.floors || [])
            .filter((f) => f.building_id === b.id)
            .map((f) => f.floor_name);
          return {
            id: b.id,
            name: b.name,
            floors: bFloors.length > 0 ? bFloors : ['1st Floor'],
          };
        });
        setBuildings(mapped);
      }
    });
  }, []);

  // Update floor options when building changes
  const activeBuildingObj = buildings.find((b) => b.name === selectedBuilding) || buildings[0];
  const isOthersBuilding = selectedBuilding.toLowerCase() === 'others';

  const handleBuildingChange = (bName) => {
    setSelectedBuilding(bName);
    const bObj = buildings.find((b) => b.name === bName);
    if (bObj && bObj.floors && bObj.floors.length > 0) {
      setSelectedFloor(bObj.floors[0]);
    } else {
      setSelectedFloor('');
    }
  };

  // Handle Primary Photo Upload
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setPrimaryPhoto(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle Additional Photos Upload
  const handleAdditionalPhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setAdditionalPhotos((prev) => [...prev, uploadEvent.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAdditionalPhoto = (idxToRemove) => {
    setAdditionalPhotos((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Step Navigators
  const goToNextStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!selectedCategory) {
        setErrorMsg('Please select an issue category.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (isOthersBuilding && !customFloor.trim()) {
        setErrorMsg('Please specify the floor level.');
        return;
      }
      if (!roomCoordinate.trim()) {
        setErrorMsg('Please provide the room, area, or coordinate.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!issueTitle.trim()) {
        setErrorMsg('Please provide a title for the issue.');
        return;
      }
      if (!description.trim()) {
        setErrorMsg('Please provide a description of the defect.');
        return;
      }
      setCurrentStep(4);
    }
  };

  const goToPrevStep = () => {
    setErrorMsg('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Report Submission
  const handleSubmitReport = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    const floorValue = isOthersBuilding ? customFloor.trim() : selectedFloor;
    const payload = {
      title: issueTitle.trim(),
      description: description.trim(),
      category_id: selectedCategory.id,
      building_id: activeBuildingObj?.id || 1,
      building_name: selectedBuilding,
      floor_name: floorValue,
      room_number: roomCoordinate.trim(),
      priority: priorityLevel.toLowerCase(),
      primary_photo: primaryPhoto,
      additional_photos: additionalPhotos,
    };

    try {
      const res = await createReport(payload);
      if (res && res.success) {
        if (onReportCreated) {
          onReportCreated({
            ...payload,
            id: res.report_id || Date.now(),
            ticket_number: res.ticket_number || 'FMC-2026-NEW',
            status: 'submitted',
            reported_at: new Date().toISOString(),
          });
        }
        isExitingRef.current = true;
        onNavigate('dashboard');
      } else {
        setErrorMsg(res?.message || 'Failed to submit report to server.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMsg('Failed to submit report. Please check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = currentUser?.full_name || 'Mark Cerna';
  const effectiveFloor = isOthersBuilding ? (customFloor || 'Custom Floor') : selectedFloor;

  return (
    <div className="rw-page-wrapper">
      {/* --------------------------------------------------------------------
          Top Navigation Bar (Figma Header)
          -------------------------------------------------------------------- */}
      <header className="rw-navbar">
        <div className="rw-nav-inner">
          <div className="rw-nav-left">
            <button
              type="button"
              className="rw-logo-btn"
              onClick={() => handleRequestExit(() => onNavigate('dashboard'))}
              title="FixMyCampus Home"
              id="rw-logo-exit-btn"
            >
              <div className="rw-logo-icon">
                <Wrench size={18} strokeWidth={2.4} />
              </div>
              <span className="rw-logo-text">FixMyCampus</span>
            </button>

            <nav className="rw-nav-links" aria-label="Main Navigation">
              <button
                type="button"
                className="rw-nav-link"
                onClick={() => handleRequestExit(() => onNavigate('dashboard'))}
                id="rw-nav-home-btn"
              >
                Home
              </button>
              <button
                type="button"
                className="rw-nav-link"
                onClick={() => handleRequestExit(() => onNavigate('dashboard'))}
                id="rw-nav-my-reports-btn"
              >
                My Reports
              </button>
              <button
                type="button"
                className="rw-nav-link active"
                onClick={() => {
                  if (currentStep > 1) {
                    handleRequestExit(() => setCurrentStep(1));
                  } else {
                    setCurrentStep(1);
                  }
                }}
                id="rw-nav-report-issue-btn"
              >
                Report Issue
              </button>
            </nav>
          </div>

          <div className="rw-nav-right">
            <button
              type="button"
              className="rw-notif-btn"
              onClick={() => setUnreadCount(0)}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="rw-notif-badge">{unreadCount}</span>}
            </button>

            <div className="rw-user-pill">
              <div className="rw-avatar-circle">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="rw-user-name">{displayName}</span>
            </div>

            <button
              type="button"
              className="rw-logout-btn"
              onClick={() => handleRequestExit(() => onLogout && onLogout())}
              title="Log Out"
              id="rw-logout-btn"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          Main Wizard Content
          -------------------------------------------------------------------- */}
      <main className="rw-main-content">
        {/* 4-Step Progress Indicator Header */}
        <div className="rw-stepper-container" aria-label="Report Steps">
          {/* Step 01: Issue */}
          <div
            className={`rw-step-node ${
              currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'upcoming'
            }`}
          >
            <div className="rw-step-circle">
              {currentStep > 1 ? <Check size={14} strokeWidth={3} /> : '01'}
            </div>
            <span className="rw-step-label">Issue</span>
          </div>

          <div className={`rw-step-connector ${currentStep > 1 ? 'completed' : ''}`} />

          {/* Step 02: Location */}
          <div
            className={`rw-step-node ${
              currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'upcoming'
            }`}
          >
            <div className="rw-step-circle">
              {currentStep > 2 ? <Check size={14} strokeWidth={3} /> : '02'}
            </div>
            <span className="rw-step-label">Location</span>
          </div>

          <div className={`rw-step-connector ${currentStep > 2 ? 'completed' : ''}`} />

          {/* Step 03: Details */}
          <div
            className={`rw-step-node ${
              currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'upcoming'
            }`}
          >
            <div className="rw-step-circle">
              {currentStep > 3 ? <Check size={14} strokeWidth={3} /> : '03'}
            </div>
            <span className="rw-step-label">Details</span>
          </div>

          <div className={`rw-step-connector ${currentStep > 3 ? 'completed' : ''}`} />

          {/* Step 04: Review */}
          <div
            className={`rw-step-node ${
              currentStep === 4 ? 'active' : 'upcoming'
            }`}
          >
            <div className="rw-step-circle">04</div>
            <span className="rw-step-label">Review</span>
          </div>
        </div>

        {/* Error Alert if any */}
        {errorMsg && (
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              color: '#b91c1c',
              fontSize: '0.88rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* ==================================================================
            STEP 1: SELECT ISSUE CATEGORY & UPLOAD PHOTO (Screenshot 1)
            ================================================================== */}
        {currentStep === 1 && (
          <div className="rw-card">
            <div className="rw-card-header">
              <h1 className="rw-card-title">Select Issue Category & Upload Photo</h1>
              <p className="rw-card-subtitle">
                Help us identify the technical domain of the defect.
              </p>
            </div>

            <div className="rw-grid-2col">
              {/* Left Column: Drag & Drop Primary Photo Upload Box */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                />
                <div
                  className="rw-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to select primary defect photo"
                >
                  {primaryPhoto ? (
                    <div className="rw-preview-img-container">
                      <img
                        src={primaryPhoto}
                        alt="Primary Defect Preview"
                        className="rw-preview-img"
                      />
                      <div className="rw-preview-overlay">
                        <button
                          type="button"
                          className="rw-overlay-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          <Camera size={14} />
                          Change Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rw-upload-empty">
                      <div className="rw-upload-icon-circle">
                        <Camera size={22} />
                      </div>
                      <h4 className="rw-upload-prompt-title">Add Primary Photo</h4>
                      <p className="rw-upload-prompt-sub">Drag & drop or browse device</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 3x3 Grid of 9 Categories */}
              <div>
                <label className="rw-section-label">Select Category</label>
                <div className="rw-categories-grid">
                  {CATEGORY_DEFINITIONS.map((cat) => {
                    const IconComponent = cat.icon;
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`rw-category-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <IconComponent className="rw-cat-icon" />
                        <span className="rw-cat-name">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rw-card-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="rw-btn-back"
                onClick={() => handleRequestExit(() => onNavigate('dashboard'))}
                id="rw-step1-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rw-btn-continue"
                onClick={goToNextStep}
                id="rw-step1-continue-btn"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            STEP 2: SET DEFECT LOCATION (Screenshot 2)
            ================================================================== */}
        {currentStep === 2 && (
          <div className="rw-card">
            <div className="rw-card-header">
              <h1 className="rw-card-title">Set defect location</h1>
              <p className="rw-card-subtitle">
                Provide precise room and floor details for maintenance coordinates.
              </p>
            </div>

            <div className="rw-grid-2col">
              {/* Left Column: Building, Floor (dropdown or textbox), Room Coordinate */}
              <div>
                {/* Building Dropdown */}
                <div className="rw-form-group">
                  <label className="rw-form-label">Campus Building</label>
                  <select
                    className="rw-select"
                    value={selectedBuilding}
                    onChange={(e) => handleBuildingChange(e.target.value)}
                    id="rw-building-select"
                  >
                    {buildings.map((b) => (
                      <option key={b.id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Floor Level: Dropdown for Standard Buildings, Textbox for "Others" */}
                <div className="rw-form-group">
                  <label className="rw-form-label">Floor Level</label>
                  {isOthersBuilding ? (
                    <input
                      type="text"
                      className="rw-input"
                      placeholder="e.g. Mezzanine, Ground, Floor 2"
                      value={customFloor}
                      onChange={(e) => setCustomFloor(e.target.value)}
                      id="rw-custom-floor-input"
                    />
                  ) : (
                    <select
                      className="rw-select"
                      value={selectedFloor}
                      onChange={(e) => setSelectedFloor(e.target.value)}
                      id="rw-floor-select"
                    >
                      {(activeBuildingObj?.floors || []).map((fl) => (
                        <option key={fl} value={fl}>
                          {fl}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Room / Area / Coordinate */}
                <div className="rw-form-group">
                  <label className="rw-form-label">Room / Area / Coordinate</label>
                  <input
                    type="text"
                    className="rw-input"
                    placeholder="e.g. PTC 306"
                    value={roomCoordinate}
                    onChange={(e) => setRoomCoordinate(e.target.value)}
                    id="rw-room-input"
                  />
                </div>
              </div>

              {/* Right Column: Campus Map Placement Preview */}
              <div>
                <label className="rw-form-label">Campus Map Placement</label>
                <div className="rw-map-card">
                  <div className="rw-map-blueprint">
                    <div className="rw-map-row">
                      <div
                        className={`rw-map-block ${
                          selectedBuilding === 'NH Building' ? 'highlighted' : 'passive'
                        }`}
                        onClick={() => handleBuildingChange('NH Building')}
                      >
                        NH Building
                      </div>
                      <div
                        className={`rw-map-block ${
                          selectedBuilding === 'MBA Building' ? 'highlighted' : 'passive'
                        }`}
                        onClick={() => handleBuildingChange('MBA Building')}
                      >
                        MBA Building
                      </div>
                    </div>

                    <div className="rw-map-road" />

                    <div className="rw-map-row">
                      <div
                        className={`rw-map-block ${
                          selectedBuilding === 'PTC Building' ? 'highlighted' : 'passive'
                        }`}
                        onClick={() => handleBuildingChange('PTC Building')}
                      >
                        PTC Building
                      </div>
                      <div
                        className={`rw-map-block ${
                          selectedBuilding === 'CMA Building' ? 'highlighted' : 'passive'
                        }`}
                        onClick={() => handleBuildingChange('CMA Building')}
                      >
                        CMA Building
                      </div>
                    </div>

                    <div className="rw-map-row" style={{ marginTop: '4px' }}>
                      <div
                        className={`rw-map-block ${
                          selectedBuilding === 'RS Building' ? 'highlighted' : 'passive'
                        }`}
                        onClick={() => handleBuildingChange('RS Building')}
                      >
                        RS Building
                      </div>
                      <div
                        className={`rw-map-block ${
                          selectedBuilding === 'Library' ? 'highlighted' : 'passive'
                        }`}
                        onClick={() => handleBuildingChange('Library')}
                      >
                        Library
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rw-card-footer">
              <button type="button" className="rw-btn-back" onClick={goToPrevStep}>
                Back
              </button>
              <button
                type="button"
                className="rw-btn-continue"
                onClick={goToNextStep}
                id="rw-step2-continue-btn"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            STEP 3: DESCRIBE THE DEFECT (Screenshot 3)
            ================================================================== */}
        {currentStep === 3 && (
          <div className="rw-card">
            <div className="rw-card-header">
              <h1 className="rw-card-title">Describe the defect</h1>
              <p className="rw-card-subtitle">
                Provide a brief summary and choose the priority level of the issue.
              </p>
            </div>

            <div className="rw-grid-2col">
              {/* Left Column: Title, Priority Level (4 buttons), Description Textarea */}
              <div>
                <div className="rw-form-group">
                  <label className="rw-form-label">Issue Title</label>
                  <input
                    type="text"
                    className="rw-input"
                    placeholder="e.g. Broken Air Conditioner"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    id="rw-title-input"
                  />
                </div>

                <div className="rw-form-group">
                  <label className="rw-form-label">Priority Level</label>
                  <div className="rw-priority-row">
                    {['Low', 'Medium', 'High', 'Urgent'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        className={`rw-priority-btn ${lvl.toLowerCase()} ${
                          priorityLevel === lvl ? 'active' : ''
                        }`}
                        onClick={() => setPriorityLevel(lvl)}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rw-form-group">
                  <label className="rw-form-label">Additional Description</label>
                  <textarea
                    className="rw-textarea"
                    rows={4}
                    placeholder="Provide details on defect symptoms, safety concerns, or specific instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    id="rw-desc-input"
                  />
                </div>
              </div>

              {/* Right Column: Additional Photos (Optional) Multi-Thumbnails */}
              <div>
                <input
                  type="file"
                  ref={multiFileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  accept="image/*"
                  onChange={handleAdditionalPhotoSelect}
                />
                <label className="rw-form-label">Additional Photos (Optional)</label>

                <div className="rw-photos-container">
                  {additionalPhotos.map((photoSrc, idx) => (
                    <div key={idx} className="rw-photo-thumb-box">
                      <img
                        src={photoSrc}
                        alt={`Additional defect attachment ${idx + 1}`}
                        className="rw-photo-thumb"
                      />
                      <button
                        type="button"
                        className="rw-photo-remove-btn"
                        onClick={() => removeAdditionalPhoto(idx)}
                        title="Remove photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  <div
                    className="rw-add-photo-slot"
                    onClick={() => multiFileInputRef.current?.click()}
                    title="Add additional photos"
                  >
                    <Plus size={22} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rw-card-footer">
              <button type="button" className="rw-btn-back" onClick={goToPrevStep}>
                Back
              </button>
              <button
                type="button"
                className="rw-btn-continue"
                onClick={goToNextStep}
                id="rw-step3-continue-btn"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            STEP 4: REVIEW YOUR REPORT DETAILS (Screenshot 4)
            ================================================================== */}
        {currentStep === 4 && (
          <div className="rw-card">
            <div className="rw-card-header">
              <h1 className="rw-card-title">Review your report details</h1>
              <p className="rw-card-subtitle">
                Please verify all coordinates and information before submitting.
              </p>
            </div>

            <div className="rw-grid-2col">
              {/* Left Column: Primary Photo Preview + Meta Box */}
              <div className="rw-review-left">
                <div className="rw-review-primary-img-wrapper">
                  <img
                    src={primaryPhoto || '/images/hero_ac_defect.jpg'}
                    alt="Review Primary Defect"
                    className="rw-review-primary-img"
                  />
                </div>

                <div className="rw-review-meta-box">
                  <div className="rw-meta-row border-bottom">
                    <span className="rw-meta-label">Category</span>
                    <div className="rw-meta-val-badge">
                      {selectedCategory && (
                        <>
                          <selectedCategory.icon size={16} />
                          <span>{selectedCategory.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rw-meta-row">
                    <span className="rw-meta-label">Priority Level</span>
                    <span className={`rw-priority-pill ${priorityLevel.toLowerCase()}`}>
                      {priorityLevel} Priority
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Title, Location Details, Description Box */}
              <div className="rw-review-right">
                <div className="rw-review-field-group">
                  <div className="rw-review-field-label">Issue Title</div>
                  <h2 className="rw-review-title">{issueTitle}</h2>
                </div>

                <div className="rw-review-field-group">
                  <div className="rw-review-field-label">Location Details</div>
                  <div className="rw-review-loc-bold">
                    {selectedBuilding}, {effectiveFloor}
                  </div>
                  <div className="rw-review-loc-coord">{roomCoordinate}</div>
                </div>

                <div className="rw-review-field-group">
                  <div className="rw-review-field-label">Additional Description</div>
                  <div className="rw-review-desc-box">{description}</div>
                </div>
              </div>
            </div>

            <div className="rw-card-footer">
              <button
                type="button"
                className="rw-btn-back"
                onClick={goToPrevStep}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="button"
                className="rw-btn-submit"
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                id="rw-submit-report-btn"
              >
                {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Start Over / Exit Confirmation Modal */}
      <ConfirmationModal
        isOpen={showExitModal}
        presetId="start_over"
        onClose={handleCancelExit}
        onConfirm={handleConfirmExit}
      />
    </div>
  );
}
