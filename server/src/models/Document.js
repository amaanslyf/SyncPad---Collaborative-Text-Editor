import mongoose from 'mongoose';

const revisionSchema = new mongoose.Schema(
  {
    snapshot: {
      type: Buffer,
      required: true,
    },
    label: {
      type: String,
      default: 'Auto-save',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByName: {
      type: String,
      default: 'System',
    },
  },
  { timestamps: true }
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled Document',
      trim: true,
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Yjs document state is stored separately by y-mongodb-provider
    // This schema stores metadata only
    isPublic: {
      type: Boolean,
      default: true, // For hackathon: all docs are publicly accessible via link
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    revisions: [revisionSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for faster queries
documentSchema.index({ owner: 1, updatedAt: -1 });
documentSchema.index({ collaborators: 1 });
documentSchema.index({ isPublic: 1, updatedAt: -1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;
