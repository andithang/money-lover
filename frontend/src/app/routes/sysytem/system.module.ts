import { NgModule } from '@angular/core';
import { UsersListComponent } from './users/users.component';
import { SharedModule } from '@shared';
import { SystemRoutingModule } from './system-routing.module';
import { SecurityQuestionMngComponent } from './security-question-mng/security-question-mng.component';
import { SecurityQuestionDetailComponent } from './security-question-mng/security-question-detail/security-question-detail.component';
import { RoleMngComponent } from './roles/roles.component';
import { RoleDialogComponent } from './roles/role-dialog.component';
import { ActionMngComponent } from './actions/actions.component';
import { ActionDialogComponent } from './actions/action-dialog.component';
import { ModuleDialogComponent } from './modules/module-dialog.component';
import { ModuleMngComponent } from './modules/modules.component';
import { PermissionMngComponent } from './permission/permissions.component';
import { PermissionDialogComponent } from './permission/permission-dialog.component';
import { SelectModuleComponent } from './modules/select-module/select-module.component';
import { SelectActionComponent } from './actions/select-action/select-action.component';
import { SelectRoleComponent } from './roles/select-role/select-role.component';
import { ChooseUserRoleComponent } from './roles/choose-user-role/choose-user-role.component';
import { TreeModulesComponent } from './tree-modules/tree-modules.component';

@NgModule({
    imports: [SharedModule, SystemRoutingModule],
    exports: [],
    declarations: [
        UsersListComponent,
        SecurityQuestionMngComponent,
        SecurityQuestionDetailComponent,
        RoleMngComponent,
        RoleDialogComponent,
        ActionMngComponent,
        ActionDialogComponent,
        ModuleMngComponent,
        ModuleDialogComponent,
        PermissionMngComponent,
        PermissionDialogComponent,
        SelectModuleComponent,
        SelectActionComponent,
        SelectRoleComponent,
        ChooseUserRoleComponent,
        TreeModulesComponent
    ]
})
export class SystemModule { }
