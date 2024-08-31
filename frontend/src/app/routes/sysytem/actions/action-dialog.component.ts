import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Action } from 'app/model/action.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActionService } from './action.service';
import { ToastrService } from 'ngx-toastr';
import { trim } from '@shared';
import { AuthorizationService } from '@shared/services/authorization.service';
import { TranslateService } from '@ngx-translate/core';
import { APP_ACTIONS } from 'app/actions';

@Component({
    selector: 'action-dialog',
    templateUrl: 'action-dialog.component.html',
    styleUrls: ['action-dialog.component.scss']
})

export class ActionDialogComponent implements OnInit {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { id?: string },
        private actionService: ActionService,
        private toast: ToastrService,
        private dialogRef: MatDialogRef<ActionDialogComponent>,
        private authorService: AuthorizationService,
        private translate: TranslateService
    ) { }

    ngOnInit() {
        // update
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.action['get-one'])) {
                this.actionService.getAction(this.data.id).subscribe(res => {
                    this.action = res;
                    this.actionForm.setValue({
                        title: res.title,
                        code: res.code,                    
                        description: res.description,                    
                    })
                }, (err) => {
                    console.error(err);
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-get-one'))
            }
        }
        // create
        else {
            this.title = "Thêm mới hành động";
            this.action = {
                title: null,
                code: null,
                description: null
            }
        }
    }

    action: Partial<Action>;
    title: string = "Chỉnh sửa hành động";
    actionForm: FormGroup = new FormGroup({
        title: new FormControl(null, Validators.required),
        code: new FormControl(null, Validators.required),
        description: new FormControl(null),
    });
    trim = trim;

    close(msg?: Partial<Action>){
        this.dialogRef.close(msg);
    }

    getCurrentData(): Action {
        return {
            ...this.action,
            ...this.actionForm.value
        }
    }

    save(){
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.action['update'])) {
                this.actionService.updateAction(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Cập nhật hành động thành công");
                    this.close(res);
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-update'));
            }
        }
        else {
            if(this.authorService.isAuthorized(APP_ACTIONS.action['update'])) {
                this.actionService.addAction(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Thêm hành động thành công");
                    this.close(res);
                })
            } else this.toast.error(this.translate.instant('my-ml.actions.message.not-allow-create'));
        }
    }

    clearFormControl(name: string){
        this.actionForm.get(name).setValue(null);
    }
}