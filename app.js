const { useState, useEffect } = React;

// Icon components
const Coffee = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const Plus = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const X = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Download = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const TrendingUp = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const Copy = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

// IndexedDB wrapper
const DB_NAME = 'BaristaTrackerDB';
const DB_VERSION = 1;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('shots')) {
        const shotStore = db.createObjectStore('shots', { keyPath: 'id', autoIncrement: true });
        shotStore.createIndex('timestamp', 'timestamp', { unique: false });
        shotStore.createIndex('beanId', 'beanId', { unique: false });
        shotStore.createIndex('rating', 'rating', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('beans')) {
        db.createObjectStore('beans', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const dbOperation = async (storeName, mode, operation) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const BaristaTrackerPWA = () => {
  const [activeTab, setActiveTab] = useState('log');
  const [shots, setShots] = useState([]);
  const [beans, setBeans] = useState([]);
  const [showBeanModal, setShowBeanModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filterTag, setFilterTag] = useState('all');
  
  const [currentShot, setCurrentShot] = useState({
    grindSettingOutside: '',
    grindSettingInside: '',
    grindAmount: '',
    doseIn: '',
    yieldOut: '',
    extractionTime: '',
    beanId: '',
    rating: 0,
    notes: '',
    tags: [],
    timestamp: new Date().toISOString()
  });
  
  const [currentBean, setCurrentBean] = useState({
    name: '',
    roaster: ''
  });

  useEffect(() => {
    loadShots();
    loadBeans();
    registerServiceWorker();
  }, []);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  };

  const loadShots = async () => {
    try {
      const allShots = await dbOperation('shots', 'readonly', (store) => store.getAll());
      setShots(allShots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
      console.error('Error loading shots:', error);
    }
  };

  const loadBeans = async () => {
    try {
      const allBeans = await dbOperation('beans', 'readonly', (store) => store.getAll());
      setBeans(allBeans);
    } catch (error) {
      console.error('Error loading beans:', error);
    }
  };

  const saveShot = async () => {
    if (!currentShot.grindSettingOutside || !currentShot.grindSettingInside || !currentShot.grindAmount || !currentShot.doseIn || !currentShot.yieldOut || !currentShot.extractionTime || !currentShot.beanId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const shotToSave = {
        ...currentShot,
        doseIn: parseFloat(currentShot.doseIn),
        yieldOut: parseFloat(currentShot.yieldOut),
        extractionTime: parseInt(currentShot.extractionTime),
        grindSettingOutside: parseFloat(currentShot.grindSettingOutside),
        grindSettingInside: parseFloat(currentShot.grindSettingInside),
        grindAmount: parseFloat(currentShot.grindAmount),
        brewRatio: (parseFloat(currentShot.yieldOut) / parseFloat(currentShot.doseIn)).toFixed(2),
        timestamp: new Date().toISOString()
      };

      await dbOperation('shots', 'readwrite', (store) => store.add(shotToSave));
      await loadShots();
      
      setCurrentShot({
        grindSettingOutside: '',
        grindSettingInside: '',
        grindAmount: '',
        doseIn: '',
        yieldOut: '',
        extractionTime: '',
        beanId: currentShot.beanId,
        rating: 0,
        notes: '',
        tags: [],
        timestamp: new Date().toISOString()
      });
      
      alert('Shot logged successfully!');
    } catch (error) {
      console.error('Error saving shot:', error);
      alert('Error saving shot');
    }
  };

  const saveBean = async () => {
    if (!currentBean.name || !currentBean.roaster) {
      alert('Please fill in bean name and roaster');
      return;
    }

    try {
      await dbOperation('beans', 'readwrite', (store) => store.add(currentBean));
      await loadBeans();
      setCurrentBean({ name: '', roaster: '' });
      setShowBeanModal(false);
    } catch (error) {
      console.error('Error saving bean:', error);
    }
  };

  const duplicateLastShot = () => {
    if (shots.length > 0) {
      const lastShot = shots[0];
      setCurrentShot({
        grindSettingOutside: lastShot.grindSettingOutside,
        grindSettingInside: lastShot.grindSettingInside,
        grindAmount: lastShot.grindAmount,
        doseIn: lastShot.doseIn,
        yieldOut: lastShot.yieldOut,
        extractionTime: lastShot.extractionTime,
        beanId: lastShot.beanId,
        rating: 0,
        notes: '',
        tags: [],
        timestamp: new Date().toISOString()
      });
    }
  };

  const toggleTag = (tag) => {
    setCurrentShot(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Bean', 'Grind Outside', 'Grind Inside', 'Grind Amount', 'Dose In (g)', 'Yield Out (g)', 'Time (s)', 'Ratio', 'Rating', 'Tags', 'Notes'];
    const rows = shots.map(shot => {
      const bean = beans.find(b => b.id === shot.beanId);
      return [
        new Date(shot.timestamp).toLocaleString(),
        bean ? `${bean.name} - ${bean.roaster}` : 'Unknown',
        shot.grindSettingOutside,
        shot.grindSettingInside,
        shot.grindAmount,
        shot.doseIn,
        shot.yieldOut,
        shot.extractionTime,
        shot.brewRatio,
        shot.rating,
        shot.tags?.join('; ') || '',
        shot.notes || ''
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barista-shots-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const calculateAnalytics = () => {
    if (shots.length === 0) return null;

    const highRatedShots = shots.filter(s => s.rating >= 4);
    const avgExtraction = shots.reduce((acc, s) => acc + s.extractionTime, 0) / shots.length;
    
    const beanStats = {};
    shots.forEach(shot => {
      if (!beanStats[shot.beanId]) {
        beanStats[shot.beanId] = { count: 0, totalTime: 0, ratings: [] };
      }
      beanStats[shot.beanId].count++;
      beanStats[shot.beanId].totalTime += shot.extractionTime;
      beanStats[shot.beanId].ratings.push(shot.rating);
    });

    return {
      totalShots: shots.length,
      avgExtraction: avgExtraction.toFixed(1),
      highRatedCount: highRatedShots.length,
      sweetSpot: highRatedShots.length > 0 ? {
        avgGrindOutside: (highRatedShots.reduce((acc, s) => acc + s.grindSettingOutside, 0) / highRatedShots.length).toFixed(1),
        avgGrindInside: (highRatedShots.reduce((acc, s) => acc + s.grindSettingInside, 0) / highRatedShots.length).toFixed(1),
        avgGrindAmount: (highRatedShots.reduce((acc, s) => acc + s.grindAmount, 0) / highRatedShots.length).toFixed(1),
        avgDose: (highRatedShots.reduce((acc, s) => acc + s.doseIn, 0) / highRatedShots.length).toFixed(1),
        avgTime: (highRatedShots.reduce((acc, s) => acc + s.extractionTime, 0) / highRatedShots.length).toFixed(1)
      } : null,
      beanStats
    };
  };

  const analytics = calculateAnalytics();
  const filteredShots = filterTag === 'all' ? shots : shots.filter(s => s.tags?.includes(filterTag));

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coffee className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Barista Tracker</h1>
            </div>
            <button onClick={exportToCSV} className="p-2 hover:bg-white/20 rounded-lg transition">
              <Download className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('log')}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                activeTab === 'log' ? 'bg-white text-amber-600 font-semibold' : 'bg-white/20'
              }`}
            >
              Log Shot
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                activeTab === 'history' ? 'bg-white text-amber-600 font-semibold' : 'bg-white/20'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('beans')}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                activeTab === 'beans' ? 'bg-white text-amber-600 font-semibold' : 'bg-white/20'
              }`}
            >
              Beans
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'log' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">New Shot</h2>
                {shots.length > 0 && (
                  <button
                    onClick={duplicateLastShot}
                    className="flex items-center gap-2 text-sm bg-amber-100 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-200 transition"
                  >
                    <Copy className="w-4 h-4" />
                    Repeat Last
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bean</label>
                <select
                  value={currentShot.beanId}
                  onChange={(e) => setCurrentShot({ ...currentShot, beanId: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Select beans...</option>
                  {beans.map(bean => (
                    <option key={bean.id} value={bean.id}>
                      {bean.name} - {bean.roaster}
                    </option>
                  ))}
                </select>
              </div>

              <h3 className="text-lg font-bold text-gray-800 mt-6 mb-3">Sage Settings</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grind Outside</label>
                  <input
                    type="number"
                    step="1"
                    value={currentShot.grindSettingOutside}
                    onChange={(e) => setCurrentShot({ ...currentShot, grindSettingOutside: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grind Inside</label>
                  <input
                    type="number"
                    step="1"
                    value={currentShot.grindSettingInside}
                    onChange={(e) => setCurrentShot({ ...currentShot, grindSettingInside: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grind Amount</label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentShot.grindAmount}
                    onChange={(e) => setCurrentShot({ ...currentShot, grindAmount: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                    placeholder="18"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dose In (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentShot.doseIn}
                    onChange={(e) => setCurrentShot({ ...currentShot, doseIn: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                    placeholder="18.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yield Out (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentShot.yieldOut}
                    onChange={(e) => setCurrentShot({ ...currentShot, yieldOut: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                    placeholder="36.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extraction Time (s)</label>
                  <input
                    type="number"
                    value={currentShot.extractionTime}
                    onChange={(e) => setCurrentShot({ ...currentShot, extractionTime: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                    placeholder="28"
                  />
                </div>
              </div>

              {currentShot.doseIn && currentShot.yieldOut && (
                <div className="bg-amber-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Brew Ratio: </span>
                  <span className="text-lg font-bold text-amber-600">
                    1:{(currentShot.yieldOut / currentShot.doseIn).toFixed(2)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setCurrentShot({ ...currentShot, rating: star })}
                      className={`text-3xl ${star <= currentShot.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {['perfect', 'too sour', 'too bitter', 'channeling', 'fast', 'slow'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition ${
                        currentShot.tags?.includes(tag)
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={currentShot.notes}
                  onChange={(e) => setCurrentShot({ ...currentShot, notes: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                  rows="3"
                  placeholder="Tasting notes..."
                />
              </div>

              <button
                onClick={saveShot}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-amber-700 hover:to-orange-700 transition shadow-md"
              >
                Log Shot
              </button>

              {analytics && analytics.sweetSpot && (
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="w-full bg-blue-50 text-blue-700 py-3 rounded-lg font-medium hover:bg-blue-100 transition flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  {showAnalytics ? 'Hide' : 'Show'} Analytics
                </button>
              )}

              {showAnalytics && analytics && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-gray-800">Your Sweet Spot (4+ ★)</h3>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600">Outside</div>
                      <div className="text-lg font-bold text-indigo-600">{analytics.sweetSpot.avgGrindOutside}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600">Inside</div>
                      <div className="text-lg font-bold text-indigo-600">{analytics.sweetSpot.avgGrindInside}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600">Amount</div>
                      <div className="text-lg font-bold text-indigo-600">{analytics.sweetSpot.avgGrindAmount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600">Dose</div>
                      <div className="text-lg font-bold text-indigo-600">{analytics.sweetSpot.avgDose}g</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-600">Time</div>
                      <div className="text-lg font-bold text-indigo-600">{analytics.sweetSpot.avgTime}s</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on {analytics.highRatedCount} high-rated shots out of {analytics.totalShots} total
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Shot History</h2>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="p-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">All Tags</option>
                  <option value="perfect">Perfect</option>
                  <option value="too sour">Too Sour</option>
                  <option value="too bitter">Too Bitter</option>
                  <option value="channeling">Channeling</option>
                </select>
              </div>

              {filteredShots.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Coffee className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No shots logged yet</p>
                </div>
              ) : (
                filteredShots.map(shot => {
                  const bean = beans.find(b => b.id === shot.beanId);
                  return (
                    <div key={shot.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-amber-300 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-gray-800">
                            {bean ? `${bean.name}` : 'Unknown Bean'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(shot.timestamp).toLocaleDateString()} {new Date(shot.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-lg ${i < shot.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-6 gap-2 mb-3">
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">Outside</div>
                          <div className="font-bold text-gray-800 text-sm">{shot.grindSettingOutside}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">Inside</div>
                          <div className="font-bold text-gray-800 text-sm">{shot.grindSettingInside}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">Amount</div>
                          <div className="font-bold text-gray-800 text-sm">{shot.grindAmount}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">Dose</div>
                          <div className="font-bold text-gray-800 text-sm">{shot.doseIn}g</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">Yield</div>
                          <div className="font-bold text-gray-800 text-sm">{shot.yieldOut}g</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">Time</div>
                          <div className="font-bold text-gray-800 text-sm">{shot.extractionTime}s</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-gray-600">Ratio: </span>
                          <span className="font-semibold text-amber-600">1:{shot.brewRatio}</span>
                        </div>
