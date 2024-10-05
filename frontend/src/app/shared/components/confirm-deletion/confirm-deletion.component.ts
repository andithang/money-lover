import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'confirm-deletion',
    templateUrl: 'confirm-deletion.component.html'
})

export class ConfirmDeletionComponent implements OnInit {
    constructor(
        private dialogRef: MatDialogRef<ConfirmDeletionComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {title: string, message: string, messageParams?: {[key: string]: string}}
    ) { }

    isConfirmed: boolean = true;

    ngOnInit() { }

    close(){
        this.dialogRef.close();
    }
}