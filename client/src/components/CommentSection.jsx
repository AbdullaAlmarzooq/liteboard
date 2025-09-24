import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import Button from "../components/Button";
import { Trash2, Edit } from 'lucide-react';

const CommentSection = ({
  comments,
  newCommentText,
  setNewCommentText,
  isAddingComment,
  handleCommentSubmit,
  handleDeleteComment,
  handleSaveCommentEdit,
  handleCancelCommentEdit,
  editingCommentId,
  setEditingCommentId,
  editingCommentText,
  setEditingCommentText,
  showDeleteModal,
  setShowDeleteModal,
  commentToDeleteId,
  confirmDeleteComment,
}) => {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Comments ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display existing comments */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between items-start">
                {editingCommentId === comment.id ? (
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => handleSaveCommentEdit(comment.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelCommentEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-gray-200 text-sm">{comment.text}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        by {comment.author} on {new Date(comment.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditingCommentText(comment.text);
                        }}
                        className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm italic">No comments yet. Add one below!</p>
          )}
        </div>

        {/* Input for new comment */}
        <div className="mt-4">
          <div className="space-y-2">
            <textarea
              name="newComment"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Write a new comment..."
              disabled={isAddingComment}
            />
            <Button
              type="button"
              onClick={handleCommentSubmit}
              disabled={isAddingComment || !newCommentText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isAddingComment ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteComment}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CommentSection;
