import mongoose from 'mongoose';
  
  const NoteSchema = new mongoose.Schema({
      title: {
          type: String,
          required: [true, 'Title is required'],
          minlength: [3, 'Title must be at least 3 characters'],
          maxlength: [100, 'Title cannot exceed 100 characters']
      },
      content: {
          type: String,
          default: ''
      },
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      collaborators: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          permission: { type: String, enum: ['view', 'edit'], default: 'view' },
          addedAt: { type: Date, default: Date.now }
        }
      ],
  }, { timestamps: true });
 
 // Full-text index on title and content for searching
 // Weights prioritize title matches higher than content matches
 NoteSchema.index(
   { title: 'text', content: 'text' },
   { name: 'NoteTextIndex', weights: { title: 5, content: 1 } }
 );
  
  export default mongoose.model('Note', NoteSchema);
