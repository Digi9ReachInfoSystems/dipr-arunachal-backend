import { getFirestore, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import moment from 'moment-timezone';

export const updateApproveCvAndTimeAllotment =  async (req, res) => {
  try {
    const { documentIds } = req.body; // Now expecting document IDs, not full paths
    
    // Validate input
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'documentIds array is required and cannot be empty'
      });
    }

    const db = getFirestore();
    const batch = writeBatch(db);
    const currentTimeIST = moment().tz('Asia/Kolkata').format('DD MMMM YYYY [at] HH:mm:ss [UTC+5:30]');

    // Process each document ID
    documentIds.forEach(docId => {
      // Validate document ID
      if (typeof docId !== 'string' || docId.trim() === '') {
        throw new Error(`Invalid document ID: ${docId}`);
      }

      // Create document reference using collection name
      const docRef = doc(db, 'NewspaperJobAllocation', docId);
      
      // Update the document with new values
      batch.update(docRef, {
        aprovedcw: true,
        timeofallotment: currentTimeIST,
        // You can add other fields you want to update here
        completed: false, // Example additional field
        invoiceraised: false // Example additional field
      });
    });

    // Commit the batch write
    await batch.commit();

    res.status(200).json({
      success: true,
      message: `${documentIds.length} document(s) in NewspaperJobAllocation collection updated successfully`,
      data: {
        updatedCount: documentIds.length,
        timestamp: currentTimeIST,
        collection: 'NewspaperJobAllocation',
        updatedFields: {
          approvedcw: true,
          timeofallotment: currentTimeIST
        }
      }
    });

  } catch (error) {
    console.error('Error updating NewspaperJobAllocation documents:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update documents in NewspaperJobAllocation collection',
      error: error.message
    });
  }
};