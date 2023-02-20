import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function AlertDialog({
  open,
  title,
  message,
  opt1,
  opt2,
  onChoice,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  opt1: string;
  opt2: string;
  onChoice: (chosen: 1 | 2) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <Dialog
        open={open}
        onClose={onClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onChoice(1)} color="primary">
            {opt1}
          </Button>
          <Button onClick={() => onChoice(2)} color="primary" autoFocus>
            {opt2}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
