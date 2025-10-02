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
  }, { timestamps: true });
  
  export default mongoose.model('Note', NoteSchema);
