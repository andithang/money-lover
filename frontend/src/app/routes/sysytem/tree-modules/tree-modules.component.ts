import { SelectionModel } from '@angular/cdk/collections';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FlatTreeControl } from '@angular/cdk/tree';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatTreeFlattener, MatTreeFlatDataSource } from '@angular/material/tree';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { Module } from 'app/model/module.model';
import { TreeModuleItem, TreeModuleItemFlatNode, TreeModuleItemModel } from 'app/model/tree-module-item.model';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { ModuleService } from '../modules/module.service';
import { CONSTS } from 'app/consts';
import { randomString } from '@shared';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeletionComponent } from '@shared/components/confirm-deletion/confirm-deletion.component';
import { ModuleDialogComponent } from '../modules/module-dialog.component';
import { TreeModuleService } from './tree-module.service';

@Component({
    selector: 'tree-modules',
    templateUrl: 'tree-modules.component.html',
    styleUrls: ['tree-modules.component.scss']
})

export class TreeModulesComponent implements OnInit, OnDestroy {
    /** Map from flat node to nested node. This helps us finding the nested node to be modified */
    flatNodeMap = new Map<TreeModuleItemFlatNode, TreeModuleItem>();

    /** Map from nested node to flattened node. This helps us to keep the same object for selection */
    nestedNodeMap = new Map<TreeModuleItem, TreeModuleItemFlatNode>();

    /** A selected parent node to be inserted */
    selectedParent: TreeModuleItemFlatNode | null = null;

    treeControl: FlatTreeControl<TreeModuleItemFlatNode>;

    treeFlattener: MatTreeFlattener<TreeModuleItem, TreeModuleItemFlatNode>;

    dataSource: MatTreeFlatDataSource<TreeModuleItem, TreeModuleItemFlatNode>;

    /** The selection for checklist */
    checklistSelection = new SelectionModel<TreeModuleItemFlatNode>(
        true /* multiple */
    );
    /**
     * - the structureClone creates new nodes, so if the .expand() comes before that, the tree will not expand.
     * - keep the expanding item after updating the tree data
     */
    expandItemAfterUpdate: string | number = '';
    currentlyExpandedNodes: (string | number)[] = [];
    /** keep a copy of data to update the dataSource when any item changed */
    private dataChange = new BehaviorSubject<TreeModuleItem[]>([]);

    /**
     * only use it when you want the hasChild directive to rerun
     */
    get dataClone(): TreeModuleItem[] {
        return structuredClone(this.dataSource.data);
    }
    listModules: Module[] = [];
    permissionChecked = new Subject<boolean>();
    formGroupNewNodes = new FormGroup({});
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    constructor(
        private moduleService: ModuleService,
        private treeModuleService: TreeModuleService,
        private dialogService: MatDialog,
        private authorService: AuthorizationService,
        private toast: ToastrService,
        private translate: TranslateService
    ) {
        this.treeFlattener = new MatTreeFlattener(
            this.transformer,
            this.getLevel,
            this.isExpandable,
            this.getChildren
        );
        this.treeControl = new FlatTreeControl<TreeModuleItemFlatNode>(
            this.getLevel,
            this.isExpandable
        );
        this.dataSource = new MatTreeFlatDataSource(
            this.treeControl,
            this.treeFlattener
        );
        this.dataChange.pipe(takeUntil(this.destroy$)).subscribe(data => {
            this.dataSource.data = data;
            if(this.expandItemAfterUpdate || this.currentlyExpandedNodes.length > 0) {
                this.treeControl.dataNodes.forEach(node => {
                    if(node._id == this.expandItemAfterUpdate || this.currentlyExpandedNodes.includes(node._id)) {
                        if(!this.treeControl.isExpanded(node)) this.treeControl.expand(node);
                    }
                })
                this.expandItemAfterUpdate = '';
                this.currentlyExpandedNodes = [];
                console.log('Cannot find expanding node!');
            }
        });
        this.authorService.getAllowActionsOnModule(location.pathname).subscribe(({actions}) => {
            this.authorService.allowActionsChange$.next(actions);
            this.permissionChecked.next(true);
        }, () => this.permissionChecked.next(true))
    }

    ngOnInit(): void {
        this.permissionChecked.pipe(takeUntil(this.destroy$)).subscribe((checked) => {
            if(checked) {
                this.getListModules();
                this.getTreeModules();
            }
        })
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.authorService.allowActionsReady$.next(false);
    }

    //#region Tree handler
    getLevel = (node: TreeModuleItemFlatNode) => node.level;

    isExpandable = (node: TreeModuleItemFlatNode) => node.expandable;

    getChildren = (node: TreeModuleItem): TreeModuleItem[] => node.children;

    hasChild = (_: number, _nodeData: TreeModuleItemFlatNode) => {
        return _nodeData.expandable;
    }

    hasNoContent = (_: number, _nodeData: TreeModuleItemFlatNode) => _nodeData.module === null;

    getFlatNode = (node: TreeModuleItemFlatNode) => {
        const keys = this.flatNodeMap.keys();
        let nextNode = keys.next();
        while(!nextNode.done) {
            if((<TreeModuleItemFlatNode>nextNode.value)._id == node._id)  return this.flatNodeMap.get(nextNode.value);
            nextNode = keys.next();
        }
        return null;
    }

    /**
     * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
     */
    transformer = (node: TreeModuleItem, level: number) => {
        const existingNode = this.nestedNodeMap.get(node);  
        const flatNode: TreeModuleItemFlatNode =
            (existingNode && existingNode._id == node._id) ? existingNode: { expandable: false, level: 0, module: null, moduleId: '', tempModuleId: '', _id: '' };
        flatNode.module = node.module;
        flatNode.moduleId = node.module ? node.module._id: '';
        flatNode.tempModuleId = node.module ? node.module._id: node._id;
        flatNode.level = level;
        flatNode._id = node._id;
        flatNode.expandable = !!node.children?.length;
        const keys = this.flatNodeMap.keys();
        // because we clone the dataSource to a completely new one, so the flatNodeMap MAY NOT BE the same as before the update/add
        // we need to find by _id and delete the old key manually
        let nextKey = keys.next();
        while(!nextKey.done) {
            if(this.flatNodeMap.get(nextKey.value)._id == node._id) {
                this.flatNodeMap.delete(nextKey.value)
                break;
            }
            nextKey = keys.next();
        }
        this.flatNodeMap.set(flatNode, node);
        this.nestedNodeMap.set(node, flatNode);
        return flatNode;
    };

    /** Whether all the descendants of the node are selected. */
    descendantsAllSelected(node: TreeModuleItemFlatNode): boolean {
        const descendants = this.treeControl.getDescendants(node);
        const descAllSelected =
            descendants.length > 0 &&
            descendants.every((child) => {
                return this.checklistSelection.isSelected(child);
            });
        return descAllSelected;
    }

    /** Whether part of the descendants are selected */
    descendantsPartiallySelected(node: TreeModuleItemFlatNode): boolean {
        const descendants = this.treeControl.getDescendants(node);
        const result = descendants.some((child) =>
            this.checklistSelection.isSelected(child)
        );
        return result && !this.descendantsAllSelected(node);
    }

    /** Toggle the to-do item selection. Select/deselect all the descendants node */
    todoItemSelectionToggle(node: TreeModuleItemFlatNode): void {
        this.checklistSelection.toggle(node);
        const descendants = this.treeControl.getDescendants(node);
        this.checklistSelection.isSelected(node)
            ? this.checklistSelection.select(...descendants)
            : this.checklistSelection.deselect(...descendants);

        // Force update for the parent
        descendants.forEach((child) => this.checklistSelection.isSelected(child));
        this.checkAllParentsSelection(node);
    }

    /** Toggle a leaf to-do item selection. Check all the parents to see if they changed */
    todoLeafItemSelectionToggle(node: TreeModuleItemFlatNode): void {
        this.checklistSelection.toggle(node);
        this.checkAllParentsSelection(node);
    }

    /* Checks all the parents when a leaf node is selected/unselected */
    checkAllParentsSelection(node: TreeModuleItemFlatNode): void {
        let parent: TreeModuleItemFlatNode | null = this.getParentNode(node);
        while (parent) {
            this.checkRootNodeSelection(parent);
            parent = this.getParentNode(parent);
        }
    }

    /** Check root node checked state and change it accordingly */
    checkRootNodeSelection(node: TreeModuleItemFlatNode): void {
        const nodeSelected = this.checklistSelection.isSelected(node);
        const descendants = this.treeControl.getDescendants(node);
        const descAllSelected =
            descendants.length > 0 &&
            descendants.every((child) => {
                return this.checklistSelection.isSelected(child);
            });
        if (nodeSelected && !descAllSelected) {
            this.checklistSelection.deselect(node);
        } else if (!nodeSelected && descAllSelected) {
            this.checklistSelection.select(node);
        }
    }

    /* Get the parent node of a node */
    getParentNode(node: TreeModuleItemFlatNode): TreeModuleItemFlatNode | null {
        const currentLevel = this.getLevel(node);
        if (currentLevel < 1) {
            return null;
        }
        const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;
        for (let i = startIndex; i >= 0; i--) {
            const currentNode = this.treeControl.dataNodes[i];

            if (this.getLevel(currentNode) < currentLevel) {
                return currentNode;
            }
        }
        return null;
    }

    /** Select the category so we can insert the new item. */
    addNewItem(node: TreeModuleItemFlatNode) {
        const parentNode = this.getFlatNode(node);
        const nodeId = randomString();
        parentNode.children = [...parentNode.children, { module: null, children: [], _id: nodeId }];
        this.formGroupNewNodes.addControl(nodeId, new FormControl('', [Validators.required]));
        this.expandItemAfterUpdate = node._id;
        this.saveExpandingNodes();
        this.dataChange.next(this.dataClone); // renew the child, now become a parent, need hasChild rerun
    }

    /** Save the node to database */
    saveNode(node: TreeModuleItemFlatNode) {
        const nestedNode = this.getFlatNode(node);
        node.moduleId = node.tempModuleId;
        nestedNode.module = this.listModules.find(m => m._id == node.moduleId);
        this.formGroupNewNodes.removeControl(node._id);
        this.saveExpandingNodes();
        this.dataChange.next(this.dataClone); // keep the expanded nodes
    }
    
    /** save the expanding nodes to reopen them after clone the tree */
    private saveExpandingNodes() {
        const expandingNodes: (string | number)[] = [];
        this.treeControl.dataNodes.forEach(node => {
            if(this.treeControl.isExpanded(node)) expandingNodes.push(node._id);
        })
        this.currentlyExpandedNodes = expandingNodes;
    }

    cancelNode(node: TreeModuleItemFlatNode) {
        const parentNode = this.getParentNode(node);
        if(parentNode) {
            const parentItem = this.getFlatNode(parentNode);
            parentItem.children = parentItem.children.filter(n => n._id != node._id);
            if(parentItem.children.length) this.dataChange.next([...this.dataSource.data]); // keep the expanded nodes
            else {
                this.saveExpandingNodes();
                this.dataChange.next(this.dataClone); // renew the child, now become a parent, need hasChild rerun
            }
        } else {
            this.dataChange.next(this.dataSource.data.filter(n => n._id != node._id)); // keep the expanded nodes
        }
        this.formGroupNewNodes.removeControl(node._id);
    }

    addNewRoot() {
        const nodeId = randomString();
        this.formGroupNewNodes.addControl(nodeId, new FormControl('', [Validators.required])); // add the control before you modify the view
        this.dataChange.next([...this.dataSource.data, { children: [], module: null, _id: nodeId }]); // keep the expanded nodes
    }

    onSelectModule(moduleId: string, node: TreeModuleItemFlatNode) {
        node.tempModuleId = moduleId;
    }

    deleteNode(node: TreeModuleItemFlatNode) {
        this.dialogService.open(ConfirmDeletionComponent, {
            data: {
                title: this.translate.instant('my-ml.tree-modules.message.confirm-delete-node'),
                message: `my-ml.tree-modules.message.confirm-remove`,
                messageParams: {name: node.module.title}
            }
        })
        .afterClosed().subscribe((isConfirmed?: boolean) => {
            if(isConfirmed){
                this.cancelNode(node);
            }
        })
    }

    viewInfor(node: TreeModuleItemFlatNode) {
        if(this.authorService.isAuthorized(APP_ACTIONS.module['get-one'])) {
            const instanceRef = this.dialogService.open(ModuleDialogComponent, {
                data: {
                    id: node.module ? node.module._id: null,
                    viewOnly: true
                },
                width: '400px'
            });
            (<ModuleDialogComponent>instanceRef.componentInstance).title = this.translate.instant('my-ml.module.title.view-detail');
        } else {
            this.toast.error(this.translate.instant('my-ml.module.message.not-allow-get-one'));
        }
    }

    /** on drop an item into a position */
    drop(evt: CdkDragDrop<string[]>) {
        const { currentIndex, previousIndex } = evt;
    }

    saveTree() {
        const dataFlatten: TreeModuleItemModel[] = [];
        Array.from(this.flatNodeMap.keys()).forEach(node => {
            dataFlatten.push({
                level: node.level,
                module: node.module,
                children: this.flatNodeMap.get(node).children,
                /** this _id is used to identify the relationship between nodes, not the _id saved in the DB */
                _id: this.flatNodeMap.get(node)._id
            })
        });
        this.treeModuleService.updateTree(dataFlatten).subscribe(() => {
            this.toast.success(this.translate.instant('my-ml.tree-modules.message.update-tree-successfully'))
        })
        console.log(dataFlatten)
    }

    //#endregion

    private getListModules() {
        if(this.authorService.isAuthorized(APP_ACTIONS.module['get-list'])) {
            this.moduleService.getListModules('', 0, CONSTS.page_size_get_all).subscribe(res => {
                this.listModules = res.results;
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.module.message.not-allow-get-list'));
        }
    }

    private getTreeModules() {
        if(this.authorService.isAuthorized(APP_ACTIONS['tree-modules']['get-tree'])) {
            this.treeModuleService.getTree().subscribe(res => {
                this.dataChange.next(res);
            })
        } else {
            this.toast.error(this.translate.instant('my-ml.tree-modules.message.not-allow-get-tree'));
        }
    }
}