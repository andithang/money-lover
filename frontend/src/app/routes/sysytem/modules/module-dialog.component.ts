import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Module } from 'app/model/module.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ModuleService } from './module.service';
import { ToastrService } from 'ngx-toastr';
import { trim } from '@shared';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';

@Component({
    selector: 'module-dialog',
    templateUrl: 'module-dialog.component.html',
    styleUrls: ['module-dialog.component.scss']
})

export class ModuleDialogComponent implements OnInit {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { id?: string },
        private moduleService: ModuleService,
        private toast: ToastrService,
        private authorService: AuthorizationService,
        private translate: TranslateService,
        private dialogRef: MatDialogRef<ModuleDialogComponent>
    ) { }

    ngOnInit() {
        // update
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.module['get-one'])) {
                this.moduleService.getModule(this.data.id).subscribe(res => {
                    this.module = res;
                    this.moduleForm.setValue({
                        title: res.title,
                        code: res.code,                    
                        description: res.description,                    
                    })
                }, (err) => {
                    console.error(err);
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.module.message.not-allow-get-one'))
            }
        }
        // create
        else {
            this.title = "Thêm mới module";
            this.module = {
                title: null,
                code: null,
                description: null
            }
        }
    }

    module: Partial<Module>;
    title: string = "Chỉnh sửa module";
    moduleForm: FormGroup = new FormGroup({
        title: new FormControl(null, Validators.required),
        code: new FormControl(null, Validators.required),
        description: new FormControl(null),
    });
    trim = trim;

    close(msg?: Partial<Module>){
        this.dialogRef.close(msg);
    }

    getCurrentData(): Module {
        return {
            ...this.module,
            ...this.moduleForm.value
        }
    }

    save(){
        if(this.data && this.data.id){
            if(this.authorService.isAuthorized(APP_ACTIONS.action['update'])) {
                this.moduleService.updateModule(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Cập nhật module thành công");
                    this.close(res);
                })
            } else {
                this.toast.error(this.translate.instant('my-ml.module.message.not-allow-update'));
            }
        }
        else {
            if(this.authorService.isAuthorized(APP_ACTIONS.module['create'])) {
                this.moduleService.addModule(this.getCurrentData())
                .subscribe(res => {
                    this.toast.success("Thêm module thành công");
                    this.close(res);
                })
            } else this.toast.error(this.translate.instant('my-ml.module.message.not-allow-create'));
        }
    }

    clearFormControl(name: string){
        this.moduleForm.get(name).setValue(null);
    }
}