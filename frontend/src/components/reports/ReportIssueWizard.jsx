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
  Menu,
  X,
  Home,
  FileText,
  PlusCircle,
  User,
} from 'lucide-react';
import {
  fetchBuildings,
  fetchCategories,
  createReport,
  fetchNotifications,
  checkDuplicateReport,
  confirmReport,
} from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';
import DuplicateReportModal from './DuplicateReportModal';
import UserProfileDropdown from '../common/UserProfileDropdown';
import CampusMapPlacement from './CampusMapPlacement';
import './reportWizard.css';



const SAMPLE_DEFECT_PHOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23ecfdf5'/><circle cx='300' cy='180' r='60' fill='%23a7f3d0'/><path d='M280 180 L295 195 L325 165' stroke='%23059669' stroke-width='8' fill='none' stroke-linecap='round'/><text x='50%25' y='280' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='20' fill='%23047857'>Facility Defect Sample Photo</text><text x='50%25' y='315' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23065f46'>FixMyCampus Inspection Photo Attached</text></svg>";

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
  { id: 10, name: 'SP (Student Plaza)', floors: ['1st Floor'] },
  { id: 11, name: 'Others', floors: [] },
];

export default function ReportIssueWizard({
  currentUser,
  onNavigate,
  onLogout,
  onReportCreated,
}) {
  // Wizard Step: 1 = Issue, 2 = Location, 3 = Details, 4 = Review
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stepParam = parseInt(params.get('step'), 10);
      if (stepParam >= 1 && stepParam <= 4) return stepParam;
    }
    return 1;
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const [primaryPhoto, setPrimaryPhoto] = useState(null); // User uploaded photo (no placeholder)
  const [additionalPhotos, setAdditionalPhotos] = useState([]); // User uploaded additional photos (no placeholders)
  const [isDragging, setIsDragging] = useState(false);

  // Location State
  const [buildings, setBuildings] = useState(DEFAULT_BUILDINGS);
  const [selectedBuilding, setSelectedBuilding] = useState('PTC Building');
  const [selectedFloor, setSelectedFloor] = useState('1st Floor');
  const [customFloor, setCustomFloor] = useState('');
  const [roomCoordinate, setRoomCoordinate] = useState('');

  // Defect Details State
  const [issueTitle, setIssueTitle] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('Medium'); // Low, Medium, High, Urgent
  const [description, setDescription] = useState('');

  const fileInputRef = useRef(null);
  const multiFileInputRef = useRef(null);

  // Duplicate Detection State
  const [duplicateReport, setDuplicateReport] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isConfirmingDuplicate, setIsConfirmingDuplicate] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const dismissedDuplicatesRef = useRef(new Set());

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

    fetchNotifications(currentUser?.id, 'student')
      .then((res) => {
        if (res && res.success) {
          if (typeof res.unread_count === 'number') {
            setUnreadCount(res.unread_count);
          } else if (Array.isArray(res.data)) {
            setUnreadCount(res.data.filter((n) => !n.is_read).length);
          }
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);



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
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPrimaryPhoto(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
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
    e.target.value = '';
  };

  const removeAdditionalPhoto = (idxToRemove) => {
    setAdditionalPhotos((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Step Navigators
  const goToNextStep = async () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!selectedCategory) {
        setErrorMsg('Please select an issue category.');
        return;
      }
      if (!primaryPhoto) {
        setErrorMsg('Please upload a primary photo of the defect before continuing.');
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

      // Check for active duplicate defect in this room & category
      const roomClean = roomCoordinate.trim();
      const checkKey = `${selectedBuilding}_${roomClean}_${selectedCategory?.slug || ''}`;

      if (!dismissedDuplicatesRef.current.has(checkKey)) {
        setIsCheckingDuplicate(true);
        try {
          const dupRes = await checkDuplicateReport({
            buildingId: activeBuildingObj?.id,
            buildingName: selectedBuilding,
            categoryId: selectedCategory?.id,
            categorySlug: selectedCategory?.slug,
            roomNumber: roomClean,
          });

          if (dupRes && dupRes.duplicate_found && dupRes.existing_report) {
            setDuplicateReport(dupRes.existing_report);
            setShowDuplicateModal(true);
            setIsCheckingDuplicate(false);
            return; // Pause navigation so student can choose path
          }
        } catch (e) {
          console.warn('Duplicate check warning:', e);
        } finally {
          setIsCheckingDuplicate(false);
        }
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

  const handleConfirmDuplicate = async () => {
    if (!duplicateReport) return;
    setIsConfirmingDuplicate(true);
    try {
      const res = await confirmReport(duplicateReport.id, duplicateReport.ticket_number);
      setShowDuplicateModal(false);
      isExitingRef.current = true;
      if (onReportCreated) {
        onReportCreated({
          id: duplicateReport.id,
          ticket_number: duplicateReport.ticket_number,
          title: duplicateReport.title,
          status: duplicateReport.status,
          priority: duplicateReport.priority,
          building_name: duplicateReport.building_name,
          room_number: duplicateReport.room_number,
          is_confirmed: true,
          confirmation_count: res.confirmation_count || (duplicateReport.confirmation_count + 1),
        });
      }
      onNavigate('my-reports');
    } catch (err) {
      console.error('Error confirming duplicate:', err);
      setShowDuplicateModal(false);
      onNavigate('my-reports');
    } finally {
      setIsConfirmingDuplicate(false);
    }
  };

  const handleDismissDuplicate = () => {
    if (duplicateReport) {
      const checkKey = `${selectedBuilding}_${roomCoordinate.trim()}_${selectedCategory?.slug || ''}`;
      dismissedDuplicatesRef.current.add(checkKey);
    }
    setShowDuplicateModal(false);
    setCurrentStep(3);
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
      priority: 'medium',
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
                onClick={() => handleRequestExit(() => onNavigate('my-reports'))}
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
              onClick={() => handleRequestExit(() => onNavigate('notifications'))}
              title="Notifications"
              id="rw-notif-btn"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="rw-notif-badge">{unreadCount}</span>}
            </button>

            <UserProfileDropdown
              currentUser={currentUser}
              onNavigate={onNavigate}
              onHistoryClick={() => handleRequestExit(() => onNavigate && onNavigate('history'))}
              onSettingsClick={() => handleRequestExit(() => onNavigate && onNavigate('settings'))}
              onLogout={() => handleRequestExit(() => onLogout && onLogout())}
              idPrefix="rw-user-profile"
            />

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              className="rw-mobile-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              id="rw-mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Drawer & Backdrop */}
        {mobileMenuOpen && (
          <div className="rw-mobile-menu-container">
            <div
              className="rw-mobile-backdrop"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="rw-mobile-drawer">
              <nav className="rw-mobile-nav-list" aria-label="Mobile Navigation">
                <button
                  type="button"
                  className="rw-mobile-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleRequestExit(() => onNavigate('dashboard'));
                  }}
                  id="rw-mobile-nav-home"
                >
                  <Home size={18} className="rw-mobile-nav-icon" />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  className="rw-mobile-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleRequestExit(() => onNavigate('my-reports'));
                  }}
                  id="rw-mobile-nav-my-reports"
                >
                  <FileText size={18} className="rw-mobile-nav-icon" />
                  <span>My Reports</span>
                </button>

                <button
                  type="button"
                  className="rw-mobile-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleRequestExit(() => onNavigate('notifications'));
                  }}
                  id="rw-mobile-nav-notifications"
                >
                  <Bell size={18} className="rw-mobile-nav-icon" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      className="rw-notif-badge"
                      style={{ position: 'static', marginLeft: 'auto' }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="rw-mobile-nav-item active"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (currentStep > 1) {
                      handleRequestExit(() => setCurrentStep(1));
                    } else {
                      setCurrentStep(1);
                    }
                  }}
                  id="rw-mobile-nav-report-issue"
                >
                  <PlusCircle size={18} className="rw-mobile-nav-icon" />
                  <span>Report Issue</span>
                  <span className="rw-mobile-active-tag">Active</span>
                </button>
              </nav>

              <div className="rw-mobile-divider" />

              {/* Mobile User Profile Summary & Quick Actions */}
              <div className="rw-mobile-user-section">
                <div className="rw-mobile-user-row">
                  <div className="rw-mobile-avatar">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser?.full_name || 'User'} />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div className="rw-mobile-user-meta">
                    <span className="rw-mobile-user-name">
                      {currentUser?.full_name || 'Mark Dyvie Cerna'}
                    </span>
                    <span className="rw-mobile-user-role">
                      {currentUser?.role_display || 'Student Account'}
                    </span>
                  </div>
                </div>

                <div className="rw-mobile-user-actions">
                  <button
                    type="button"
                    className="rw-mobile-action-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleRequestExit(() => onNavigate && onNavigate('settings'));
                    }}
                  >
                    <span>Account Settings</span>
                  </button>
                  <button
                    type="button"
                    className="rw-mobile-action-btn rw-mobile-logout"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleRequestExit(() => onLogout && onLogout());
                    }}
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
              {/* Left Column: Drag & Drop Primary Defect Photo Upload Box */}
              <div>
                <label className="rw-section-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
                  Primary Defect Photo
                  {!primaryPhoto && <span className="rw-required-asterisk" title="Required">*</span>}
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                />
                <div
                  className={`rw-upload-dropzone ${isDragging ? 'drag-active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  title="Click or drag image to select primary defect photo"
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
                        <button
                          type="button"
                          className="rw-overlay-btn danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryPhoto(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          title="Remove photo"
                        >
                          <Trash2 size={14} />
                          Remove
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
                      <button
                        type="button"
                        className="rw-sample-photo-btn"
                        id="rw-use-sample-photo-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryPhoto(SAMPLE_DEFECT_PHOTO);
                        }}
                      >
                        Use Sample Photo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 4x1 Vertically Scrollable Category Selection */}
              <div>
                <div className="rw-category-header-row" style={{ marginBottom: '0.75rem' }}>
                  <label className="rw-section-label">Select Category</label>
                  {selectedCategory && (
                    <span className="rw-selected-badge" title="Currently selected category">
                      <Check size={12} strokeWidth={3} />
                      {selectedCategory.name}
                    </span>
                  )}
                </div>

                {/* 4x1 Vertical Scrollable List (1 column, 4 visible, scrollable up and down) */}
                <div className="rw-categories-vertical-list">
                  {CATEGORY_DEFINITIONS.map((cat) => {
                    const IconComponent = cat.icon;
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`rw-category-card rw-category-card-vertical ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                        title={`Select ${cat.name}`}
                      >
                        <div className={`rw-cat-icon-badge ${isSelected ? 'selected' : ''}`}>
                          <IconComponent className="rw-cat-icon" />
                        </div>
                        <span className="rw-cat-name">{cat.name}</span>
                        {isSelected && (
                          <Check size={14} strokeWidth={3} className="rw-cat-check" />
                        )}
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
                disabled={!primaryPhoto}
                id="rw-step1-continue-btn"
                title={!primaryPhoto ? 'Please upload a primary photo of the defect to continue' : 'Continue to defect location'}
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
            <div className="rw-grid-2col">
              {/* Left Column: Title & Subtitle + Building, Floor, Room Coordinate */}
              <div>
                <div className="rw-card-header" style={{ marginBottom: '1.5rem' }}>
                  <h1 className="rw-card-title">Set defect location</h1>
                  <p className="rw-card-subtitle">
                    Provide precise room and floor details for maintenance coordinates.
                  </p>
                </div>

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
                    value={roomCoordinate}
                    onChange={(e) => setRoomCoordinate(e.target.value)}
                    id="rw-room-input"
                  />
                </div>
              </div>

              {/* Right Column: Campus Map Placement Preview */}
              <div>
                <div className="rw-card-header" style={{ marginBottom: '1.5rem' }}>
                  <h2 className="rw-card-title" style={{ fontSize: '1.5rem' }}>
                    Campus Map Placement
                  </h2>
                  <p className="rw-card-subtitle">
                    Pinpoint defect coordinates on the interactive campus route map.
                  </p>
                </div>
                <CampusMapPlacement
                  selectedBuilding={selectedBuilding}
                  onSelectBuilding={handleBuildingChange}
                  buildings={buildings}
                  roomCoordinate={roomCoordinate}
                  onCoordinateChange={setRoomCoordinate}
                />
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
                Provide a brief summary and description of the defect.
              </p>
            </div>

            <div className="rw-grid-2col">
              {/* Left Column: Title, Description Textarea */}
              <div>
                <div className="rw-form-group">
                  <label className="rw-form-label">Issue Title</label>
                  <input
                    type="text"
                    className="rw-input"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    id="rw-title-input"
                  />
                </div>

                <div className="rw-form-group">
                  <label className="rw-form-label">Additional Description</label>
                  <textarea
                    className="rw-textarea"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ resize: 'none', overflowY: 'auto' }}
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
                  {primaryPhoto ? (
                    <img
                      src={primaryPhoto}
                      alt="Review Primary Defect"
                      className="rw-review-primary-img"
                    />
                  ) : (
                    <div className="rw-review-no-photo">
                      <Camera size={38} className="rw-review-no-photo-icon" />
                      <span className="rw-review-no-photo-text">No Primary Photo Attached</span>
                      <span className="rw-review-no-photo-sub">Optional attachment omitted</span>
                    </div>
                  )}
                </div>

                {additionalPhotos.length > 0 && (
                  <div className="rw-review-additional-strip">
                    {additionalPhotos.map((imgSrc, idx) => (
                      <img
                        key={idx}
                        src={imgSrc}
                        alt={`Additional photo ${idx + 1}`}
                        className="rw-review-thumb-mini"
                        title={`Attachment ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                <div className="rw-review-meta-box">
                  <div className="rw-meta-row">
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
                </div>
              </div>

              {/* Right Column: Title, Location Details, Description Box & Suggested Specialist */}
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
                  <div className="rw-review-desc-box">
                    {description && description.trim() ? (
                      description
                    ) : (
                      <span className="rw-review-desc-empty">No additional description provided.</span>
                    )}
                  </div>
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

      {/* Duplicate / Existing Issue Detection Modal */}
      <DuplicateReportModal
        isOpen={showDuplicateModal}
        duplicate={duplicateReport}
        onConfirmDuplicate={handleConfirmDuplicate}
        onDismiss={handleDismissDuplicate}
        isSubmitting={isConfirmingDuplicate}
      />
    </div>
  );
}
