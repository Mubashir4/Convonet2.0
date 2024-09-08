const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const docxParser = require('docx-parser');
const ContextDoc = require('../models/contextDoc');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.array('files'), async (req, res) => {
  const files = req.files;
  const { email } = req.body; // Ensure email is being received

  try {
    const contextDocs = await Promise.all(files.map(async (file) => {
      let text = '';
      const filePath = path.join(__dirname, '..', file.path);

      if (file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text;
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await new Promise((resolve, reject) => {
          docxParser.parseDocx(filePath, (data) => resolve(data));
        });
      } else if (file.mimetype === 'text/plain') {
        text = fs.readFileSync(filePath, 'utf-8');
      } else {
        throw new Error('Unsupported file format');
      }

      fs.unlinkSync(filePath);

      return new ContextDoc({
        email,
        text,
        name: path.basename(file.originalname, path.extname(file.originalname)),
        updated_at: new Date(),
        active: true // default to active
      });
    }));

    await ContextDoc.insertMany(contextDocs);
    res.status(200).json({ msg: 'Documents uploaded and saved successfully' });
  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ error: 'Error processing files' });
  }
});

router.get('/', async (req, res) => {
    try {
      const contextDocs = await ContextDoc.find({});
      res.status(200).json(contextDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ msg: 'Server error' });
    }
  });

// New GET route to fetch only file names and active status
router.get('/active-docs', async (req, res) => {
  try {
    const contextDocs = await ContextDoc.find({ active: true }); // Fetch only active documents
    res.status(200).json(contextDocs);
  } catch (error) {
    console.error('Error fetching active documents:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// New GET route to fetch only file names and active status
router.get('/all-docs', async (req, res) => {
  try {
    const contextDocs = await ContextDoc.find({}); // Fetch only active documents
    res.status(200).json(contextDocs);
  } catch (error) {
    console.error('Error fetching active documents:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

  

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const contextDoc = await ContextDoc.findByIdAndUpdate(id, updates, { new: true });
    res.json(contextDoc);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  try {
    const contextDoc = await ContextDoc.findOneAndDelete({ _id: id, email });
    if (!contextDoc) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(200).json({ msg: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
