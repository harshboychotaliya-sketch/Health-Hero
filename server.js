const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== DATABASE ====================
const medicines = [
  {
    id: 'M001',
    name: 'Paracetamol',
    dosage: '500mg',
    timing: 'Twice daily',
    meals: 'After meals',
    duration: '5 days',
    uses: 'Pain, Fever',
    sideEffects: ['Nausea', 'Rare: Liver damage'],
    precautions: ['Liver disease', 'Pregnancy caution'],
    timing_details: 'Every 6-8 hours'
  },
  {
    id: 'M002',
    name: 'Ibuprofen',
    dosage: '200-400mg',
    timing: 'When needed',
    meals: 'With food',
    duration: '5 days',
    uses: 'Pain, Inflammation, Fever',
    sideEffects: ['Stomach upset', 'GI bleeding'],
    precautions: ['Kidney disease', 'Heart disease'],
    timing_details: 'Every 4-6 hours'
  },
  {
    id: 'M005',
    name: 'Metformin',
    dosage: '500-1000mg',
    timing: 'Twice daily',
    meals: 'With meals',
    duration: 'Ongoing',
    uses: 'Diabetes Type 2',
    sideEffects: ['Nausea', 'Diarrhea', 'Metallic taste'],
    precautions: ['Check kidney function', 'Monitor blood sugar'],
    timing_details: 'With breakfast and dinner'
  },
  {
    id: 'M006',
    name: 'Atorvastatin',
    dosage: '10-40mg',
    timing: 'Once daily',
    meals: 'With or without food',
    duration: 'Ongoing',
    uses: 'High Cholesterol',
    sideEffects: ['Muscle pain', 'Headache', 'Fatigue'],
    precautions: ['Liver disease', 'Regular cholesterol check'],
    timing_details: 'Usually in the evening'
  },
  {
    id: 'M003',
    name: 'Aspirin',
    dosage: '75-325mg',
    timing: 'Once daily',
    meals: 'With food',
    duration: 'Ongoing',
    uses: 'Heart protection, Blood thinner',
    sideEffects: ['Stomach upset', 'Bleeding', 'Bruising'],
    precautions: ['Bleeding disorders', 'Pregnancy'],
    timing_details: 'With breakfast'
  },
  {
    id: 'M007',
    name: 'Lisinopril',
    dosage: '5-10mg',
    timing: 'Once daily',
    meals: 'With or without food',
    duration: 'Ongoing',
    uses: 'High Blood Pressure',
    sideEffects: ['Dry cough', 'Dizziness', 'Low BP'],
    precautions: ['Kidney disease', 'Pregnancy'],
    timing_details: 'Once in morning'
  },
  {
    id: 'M008',
    name: 'Omeprazole',
    dosage: '20-40mg',
    timing: 'Once daily',
    meals: 'Before meals',
    duration: 'As needed',
    uses: 'Acid Reflux, Ulcers, GERD',
    sideEffects: ['Headache', 'Diarrhea', 'Nausea'],
    precautions: ['Long-term use caution', 'Monitor calcium'],
    timing_details: '30 minutes before breakfast'
  },
  {
    id: 'M009',
    name: 'Amoxicillin',
    dosage: '250-500mg',
    timing: 'Three times daily',
    meals: 'With or without food',
    duration: '7-10 days',
    uses: 'Bacterial Infection',
    sideEffects: ['Allergy', 'Diarrhea', 'Nausea'],
    precautions: ['Penicillin allergy', 'Mononucleosis'],
    timing_details: 'Every 8 hours'
  },
  {
    id: 'M010',
    name: 'Levothyroxine',
    dosage: '25-200mcg',
    timing: 'Once daily',
    meals: 'On empty stomach',
    duration: 'Ongoing',
    uses: 'Thyroid Hormone',
    sideEffects: ['Palpitations', 'Anxiety', 'Tremor'],
    precautions: ['Heart disease', 'Hyperthyroidism'],
    timing_details: '30-60 minutes before breakfast'
  },
  {
    id: 'M011',
    name: 'Amlodipine',
    dosage: '5-10mg',
    timing: 'Once daily',
    meals: 'With or without food',
    duration: 'Ongoing',
    uses: 'High Blood Pressure, Angina',
    sideEffects: ['Swelling', 'Dizziness', 'Headache'],
    precautions: ['Severe hypotension', 'Liver disease'],
    timing_details: 'Once daily, any time'
  },
  {
    id: 'M012',
    name: 'Ranitidine',
    dosage: '150-300mg',
    timing: 'Once or twice daily',
    meals: 'With or without food',
    duration: 'As needed',
    uses: 'Heartburn, Ulcers',
    sideEffects: ['Headache', 'Diarrhea', 'Constipation'],
    precautions: ['Liver disease', 'Kidney disease'],
    timing_details: 'Once at night or twice daily'
  },
  {
    id: 'M013',
    name: 'Vitamin D3',
    dosage: '1000-2000 IU',
    timing: 'Once daily',
    meals: 'With fat-containing meal',
    duration: 'Ongoing',
    uses: 'Vitamin D Deficiency, Bone Health',
    sideEffects: ['Rare: Hypercalcemia'],
    precautions: ['Kidney disease', 'High calcium'],
    timing_details: 'With breakfast'
  }
];

const conditions = [
  {
    id: 'C001',
    name: 'Hypertension',
    medicines: ['M007', 'M011'],
    diet: 'Low salt diet, Increase potassium',
    symptoms: 'Headache, Dizziness, Chest pain'
  },
  {
    id: 'C002',
    name: 'Diabetes Type 2',
    medicines: ['M005'],
    diet: 'Low sugar, Whole grains, Lean protein',
    symptoms: 'Thirst, Frequent urination, Fatigue'
  },
  {
    id: 'C003',
    name: 'High Cholesterol',
    medicines: ['M006'],
    diet: 'Low fat, High fiber, Omega-3',
    symptoms: 'Usually no symptoms'
  }
];

const bloodTests = {
  'glucose': {
    tests: [
      { name: 'Fasting Blood Sugar', normal: '70-100', unit: 'mg/dL' },
      { name: 'HbA1c', normal: '<5.7', unit: '%' }
    ],
    relatedMedicines: ['M005']
  },
  'blood': {
    tests: [
      { name: 'Hemoglobin', normal: '12-16', unit: 'g/dL' },
      { name: 'Total Cholesterol', normal: '<200', unit: 'mg/dL' },
      { name: 'Blood Sugar', normal: '70-100', unit: 'mg/dL' }
    ],
    relatedMedicines: ['M006', 'M005']
  },
  'ecg': {
    tests: [
      { name: 'Heart Rate', normal: '60-100', unit: 'bpm' },
      { name: 'QT Interval', normal: '<440', unit: 'ms' }
    ],
    relatedMedicines: ['M007', 'M011']
  }
};

const glossary = [
  {
    plain: 'High blood pressure',
    medical: 'Hypertension',
    explanation: 'Blood pressure above 140/90 mmHg. Increases heart disease risk.'
  },
  {
    plain: 'Low blood sugar',
    medical: 'Hypoglycemia',
    explanation: 'Blood sugar below 70 mg/dL. Causes weakness and confusion.'
  },
  {
    plain: 'High cholesterol',
    medical: 'Hyperlipidemia',
    explanation: 'Excessive cholesterol in blood. Increases heart disease risk.'
  },
  {
    plain: 'Inflammation',
    medical: 'Inflammation',
    explanation: 'Body response to injury. Causes swelling and pain.'
  },
  {
    plain: 'Infection',
    medical: 'Infection',
    explanation: 'Invasion of harmful bacteria or virus.'
  }
];

// ==================== ANALYSIS RULES ====================
const analysisRules = {
  'Hemoglobin': {
    min: 12, max: 16,
    lowMeaning: 'Anemia - low oxygen carrying capacity. Causes fatigue.',
    highMeaning: 'Polycythemia - elevated red blood cells. Monitor closely.',
    medicines: ['M001', 'M002']
  },
  'Total Cholesterol': {
    min: 0, max: 200,
    lowMeaning: 'Very low cholesterol - rare condition.',
    highMeaning: 'Heart disease risk - needs medication and lifestyle changes.',
    medicines: ['M006']
  },
  'Blood Sugar': {
    min: 70, max: 100,
    lowMeaning: 'Hypoglycemia - dangerously low. Eat sugar immediately.',
    highMeaning: 'Pre-diabetes or Diabetes range - consult doctor.',
    medicines: ['M005']
  },
  'HbA1c': {
    min: 0, max: 5.7,
    lowMeaning: 'Good glucose control over 3 months.',
    highMeaning: 'Poorly controlled diabetes. Medication adjustment needed.',
    medicines: ['M005']
  }
};

// ==================== ENDPOINTS ====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'HealthHero API', timestamp: new Date() });
});

// ==================== SEARCH MEDICINES ====================
app.get('/api/search/medicines', (req, res) => {
  try {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const results = medicines.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.uses.toLowerCase().includes(query)
    );
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEARCH CONDITIONS ====================
app.get('/api/search/conditions', (req, res) => {
  try {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const results = conditions.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.symptoms.toLowerCase().includes(query)
    );
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEARCH GLOSSARY ====================
app.get('/api/search/glossary', (req, res) => {
  try {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const results = glossary.filter(g =>
      g.plain.toLowerCase().includes(query) ||
      g.medical.toLowerCase().includes(query)
    );
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANALYZE DOCUMENT ====================
app.post('/api/analyze/document', async (req, res) => {
  try {
    const { content, type } = req.body;

    // Simulated medicine extraction
    const foundMedicines = [
      {
        name: 'Paracetamol',
        dosage: '500mg',
        timing: 'Twice daily',
        meals: 'After meals',
        duration: '5 days',
        sideEffects: ['Nausea', 'Rare: Liver damage'],
        precautions: ['Liver disease', 'Pregnancy caution']
      },
      {
        name: 'Ibuprofen',
        dosage: '200mg',
        timing: 'When needed',
        meals: 'With food',
        duration: '5 days',
        sideEffects: ['Stomach upset', 'GI bleeding'],
        precautions: ['Kidney disease', 'Heart disease']
      }
    ];

    const analysis = {
      documentType: 'Medical Prescription',
      medicinesFound: foundMedicines,
      plainLanguageSummary: 'You have been prescribed two medicines for pain and fever relief.',
      warnings: ['Avoid alcohol', 'Stay hydrated', 'Do not exceed dosage'],
      precautions: ['Take with food', 'If pain persists beyond 5 days, consult doctor']
    };

    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANALYZE REPORT MANUAL ====================
app.post('/api/reports/analyze-manual', (req, res) => {
  try {
    const { reportType, parameters } = req.body;

    const results = [];
    const recommendedMedicines = [];

    // Analyze each value
    Object.entries(parameters || {}).forEach(([testName, value]) => {
      const rule = analysisRules[testName];
      if (rule) {
        const numValue = parseFloat(value);
        let status = 'NORMAL';
        let meaning = 'Normal range';
        let color = 'normal';

        if (numValue < rule.min) {
          status = 'LOW';
          meaning = rule.lowMeaning;
          color = 'warning';
        } else if (numValue > rule.max) {
          status = 'HIGH';
          meaning = rule.highMeaning;
          color = 'warning';
        }

        results.push({
          testName,
          yourValue: value,
          normalRange: `${rule.min}-${rule.max}`,
          status,
          meaning,
          color
        });

        // Add recommended medicines
        if (rule.medicines) {
          recommendedMedicines.push(...rule.medicines);
        }
      }
    });

    // Get medicine details
    const uniqueMedicineIds = [...new Set(recommendedMedicines)];
    const medicineDetails = medicines.filter(m => uniqueMedicineIds.includes(m.id));

    res.json({
      success: true,
      reportAnalysis: results,
      recommendedMedicines: medicineDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET BLOOD TEST INFO ====================
app.get('/api/reports/reference-values', (req, res) => {
  try {
    const type = req.query.type || 'blood';
    const values = bloodTests[type] || {};
    res.json({ success: true, values });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET SINGLE MEDICINE DETAILS ====================
app.get('/api/medicines/:id', (req, res) => {
  try {
    const medicine = medicines.find(m => m.id === req.params.id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET ALL MEDICINES ====================
app.get('/api/medicines', (req, res) => {
  try {
    res.json({ success: true, medicines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET CONDITIONS WITH MEDICINES ====================
app.get('/api/conditions/:id', (req, res) => {
  try {
    const condition = conditions.find(c => c.id === req.params.id);
    if (!condition) {
      return res.status(404).json({ error: 'Condition not found' });
    }

    // Get medicine details for this condition
    const recommendedMedicines = medicines.filter(m =>
      condition.medicines.includes(m.id)
    );

    res.json({
      success: true,
      condition,
      recommendedMedicines
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRESCRIPTION READING ====================
app.post('/api/analyze/prescription', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    // Simulated medicine extraction from image
    const extractedMedicines = [
      {
        name: 'Metformin',
        dosage: '500mg',
        timing: 'Once daily',
        meals: 'With breakfast',
        duration: '30 days',
        sideEffects: ['Nausea', 'Diarrhea'],
        precautions: ['Check kidney function']
      },
      {
        name: 'Atorvastatin',
        dosage: '10mg',
        timing: 'Once at night',
        meals: 'With or without food',
        duration: '30 days',
        sideEffects: ['Muscle pain', 'Headache'],
        precautions: ['Monitor liver function']
      }
    ];

    res.json({
      success: true,
      extractedMedicines,
      confidence: 0.95
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SERVE FRONTEND ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'HealthHero_Frontend_Updated.html'));
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: {
      'GET /health': 'Server status',
      'GET /api/search/medicines?q=...': 'Search medicines',
      'GET /api/search/conditions?q=...': 'Search conditions',
      'GET /api/search/glossary?q=...': 'Search glossary',
      'GET /api/medicines': 'Get all medicines',
      'GET /api/medicines/:id': 'Get medicine details',
      'GET /api/conditions/:id': 'Get condition details',
      'POST /api/analyze/document': 'Analyze medical document',
      'POST /api/analyze/prescription': 'Read prescription',
      'POST /api/reports/analyze-manual': 'Analyze report'
    }
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  💚 HealthHero API Server Started         ║');
  console.log(`║  🌐 http://localhost:${PORT}                       ║`);
  console.log('║  📡 All endpoints ready                    ║');
  console.log('║  ✅ Lavender flowers background enabled   ║');
  console.log('║  ✅ Medicine schedule tables included      ║');
  console.log('║  ✅ Chatbot logo active                    ║');
  console.log('╚════════════════════════════════════════════╝\n');
});

module.exports = app;
