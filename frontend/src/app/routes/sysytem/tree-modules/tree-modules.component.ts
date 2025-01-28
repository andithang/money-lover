import { SelectionModel } from '@angular/cdk/collections';
import { CdkDragDrop, CdkDragStart } from '@angular/cdk/drag-drop';
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
                // find in nestedNodeMap the key with the value equals to nextKey.value, and delete it BEFORE you delete nextKey.value from the flatNodeMap
                this.nestedNodeMap.delete(this.flatNodeMap.get(nextKey.value));
                this.flatNodeMap.delete(nextKey.value);
                break;
            }
            nextKey = keys.next();
        }
        this.flatNodeMap.set(flatNode, node);
        this.nestedNodeMap.set(node, flatNode);
        return flatNode;
    };

    //#region NO USE
    /** Whether all the descendants of the node are selected. */
    private descendantsAllSelected(node: TreeModuleItemFlatNode): boolean {
        const descendants = this.treeControl.getDescendants(node);
        const descAllSelected =
            descendants.length > 0 &&
            descendants.every((child) => {
                return this.checklistSelection.isSelected(child);
            });
        return descAllSelected;
    }

    /** Whether part of the descendants are selected */
    private descendantsPartiallySelected(node: TreeModuleItemFlatNode): boolean {
        const descendants = this.treeControl.getDescendants(node);
        const result = descendants.some((child) =>
            this.checklistSelection.isSelected(child)
        );
        return result && !this.descendantsAllSelected(node);
    }

    /** Toggle the to-do item selection. Select/deselect all the descendants node */
    private todoItemSelectionToggle(node: TreeModuleItemFlatNode): void {
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
    private todoLeafItemSelectionToggle(node: TreeModuleItemFlatNode): void {
        this.checklistSelection.toggle(node);
        this.checkAllParentsSelection(node);
    }

    /* Checks all the parents when a leaf node is selected/unselected */
    private checkAllParentsSelection(node: TreeModuleItemFlatNode): void {
        let parent: TreeModuleItemFlatNode | null = this.getParentNode(node);
        while (parent) {
            this.checkRootNodeSelection(parent);
            parent = this.getParentNode(parent);
        }
    }

    /** Check root node checked state and change it accordingly */
    private checkRootNodeSelection(node: TreeModuleItemFlatNode): void {
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
    //#endregion

    /* Get the parent FLAT node of a FLAT node */
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

    private deleteFlatNodeById(id: string) {
        const flatKeys = this.flatNodeMap.keys();
        let currKey = flatKeys.next();
        while(!currKey.done) {
            if(currKey.value._id == id) {
                this.flatNodeMap.delete(currKey.value);
                break;
            }
            currKey = flatKeys.next();
        }
    }

    cancelNode(node: TreeModuleItemFlatNode) {
        const parentFlatNode = this.getParentNode(node);
        this.deleteFlatNodeById(node._id);
        if(parentFlatNode) {
            const parentNode = this.getFlatNode(parentFlatNode);
            parentNode.children = parentNode.children.filter(n => n._id != node._id);
            if(parentNode.children.length) this.dataChange.next([...this.dataSource.data]); // keep the expanded nodes
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

    //#region Drag & drop
    
    private getVisibleNodes() {
        const visibleNodes: TreeModuleItem[] = [];
        const addExpandChildren = (node: TreeModuleItem) => {
            visibleNodes.push(node);
            // if this node is in the current expansion list, so all of its children are visible
            if(this.treeControl.expansionModel.selected.find(n => n._id == node._id)) {
                node.children.forEach(child => addExpandChildren(child));
            }
        }
        this.dataSource.data.forEach(node => {
            addExpandChildren(node);
        });
        return visibleNodes;
    }

    private findSiblingNodes(newIndex: number, currIndex: number, draggingNode: TreeModuleItem): { previous: TreeModuleItem | null, next: TreeModuleItem | null } {
        const visibleNodes = this.getVisibleNodes();
        if(newIndex == 0) {
            return {
                next: visibleNodes[0],
                previous: null
            }
        } else {
            if(newIndex == visibleNodes.length - 1) {
                return {
                    next: null,
                    previous: visibleNodes[visibleNodes.length - 1]
                }
            } else {
                visibleNodes.splice(currIndex, 1);
                visibleNodes.splice(newIndex, 0, draggingNode);
                return {
                    previous: visibleNodes[newIndex - 1],
                    next: visibleNodes[newIndex + 1]
                }
            }
        }
    }

    private findNewParentAfterDrop(node: TreeModuleItem, previous: TreeModuleItem | null, next: TreeModuleItem | null): {
        parent: TreeModuleItem,
        nodeLevel: number,
        preNodeLevel: number,
        nextNodeLevel: number
    } {
        const nodeLevel = this.nestedNodeMap.get(node).level, preNodeLevel = previous ? this.nestedNodeMap.get(previous).level: undefined, nextNodeLevel = next ? this.nestedNodeMap.get(next).level: undefined;
        let parent: TreeModuleItem;
        if(preNodeLevel < nextNodeLevel) {
            parent = previous || undefined; // in case of no previous node, this dragging node will not have a parent
        } else {
            if(preNodeLevel == nextNodeLevel) { // drop between 2 children of the same parent
                const flatNode = this.nestedNodeMap.get(previous);
                const flatParentNode = this.getParentNode(flatNode);
                parent = this.flatNodeMap.get(flatParentNode);
            } else {
                // drop between a child (C) of A (level n+m) and a B (level n)
                const test = Math.random();
                // case 1: You want the dragging node to be the sibling node of C ==> You drop the node into C
                if(test > 0.5) {
                    const flatNode = this.nestedNodeMap.get(previous);
                    const flatParentNode = this.getParentNode(flatNode);
                    parent = this.flatNodeMap.get(flatParentNode);
                }
                // case 2: You want the dragging node to be the sibling node of B ==> You drop the node into B
                else {
                    const flatNode = this.nestedNodeMap.get(next);
                    const flatParentNode = this.getParentNode(flatNode);
                    parent = this.flatNodeMap.get(flatParentNode);
                }
            }
        }
        return { parent, nodeLevel, preNodeLevel, nextNodeLevel }
    }

    /** get parent node from node item. Neither the node nor the result parent a FLAT node */
    private getParentNodeFromNode(node: TreeModuleItem): TreeModuleItem | undefined {
        const currFlatNode = this.nestedNodeMap.get(node);
        const oldParentFlatNode = this.getParentNode(currFlatNode);
        return this.flatNodeMap.get(oldParentFlatNode);
    }

    /** on drop an item into a position */
    drop(evt: CdkDragDrop<string[]>) {
        const { currentIndex: newIndex, previousIndex, container, previousContainer, event } = evt;
        // 1. find the new parent when moving to the new position
        const visibleNodes = this.getVisibleNodes();
        const currNode = visibleNodes[previousIndex];
        const siblingNodes = this.findSiblingNodes(newIndex, previousIndex, currNode);
        const { parent: parentNode } = this.findNewParentAfterDrop(currNode, siblingNodes.previous, siblingNodes.next);        
        // 2. drop inside a parent node        
        if(parentNode) {
            // 2.1. find the index for the new child
            const parentNodeInd = visibleNodes.findIndex(node => node == parentNode);
            const preNodeInd = visibleNodes.findIndex(node => node == siblingNodes.previous);
            const currNodeInd = visibleNodes.findIndex(node => node == currNode);
            const preNodeIndInChildren = preNodeInd - parentNodeInd - 1, 
            currNodeIndInNewChildren = (currNodeInd < preNodeInd && currNodeInd > parentNodeInd) ?  preNodeIndInChildren: preNodeIndInChildren + 1;
            // 2.2. remove the dragging node in old parent
            const oldParent = this.getParentNodeFromNode(currNode);
            // 2.2.1. the dragging node is a child node
            if(oldParent) {
                if(oldParent == parentNode) {
                    // in this case we should have the currNode in 2 positions in the array of children.
                    // remove the one at the old index
                    for (let index = 0; index < parentNode.children.length; index++) {
                        if(currNode == parentNode.children[index] && index != currNodeIndInNewChildren)  {
                            parentNode.children.splice(index, 1);
                            break;
                        }
                    }
                } else {
                    const currNodeIndInOldParent = oldParent.children.findIndex(n => n == currNode);
                    oldParent.children.splice(currNodeIndInOldParent, 1);
                }
            }
            // 2.2.2. the dragging node was a root node
            else {
                const currNodeInd = this.dataSource.data.findIndex(n => n == currNode);
                this.dataSource.data.splice(currNodeInd, 1);    
            }
            // 2.3. insert the dragging node to the desired index
            parentNode.children.splice(currNodeIndInNewChildren, 0, currNode);
        } 
        // 3. drop outside to be a root node
        else {
            // 3.1. remove the dragging node in old parent
            const oldParent = this.getParentNodeFromNode(currNode);
            // 3.1.1. the dragging node was a child node
            if(oldParent) {
                const currNodeIndInOldParent = oldParent.children.findIndex(n => n == currNode);
                oldParent.children.splice(currNodeIndInOldParent, 1);
            }
            // 3.1.2. the dragging node was a root node
            else {
                const currNodeInd = this.dataSource.data.findIndex(n => n == currNode);
                this.dataSource.data.splice(currNodeInd, 1);    
            }
            // 3.2. insert the dragging node into the desired index
            if(siblingNodes.next) {
                const nextInd = this.dataSource.data.findIndex(n => n == siblingNodes.next);
                this.dataSource.data.splice(nextInd, 0, currNode);
            } else if(siblingNodes.previous) {
                const previousInd = this.dataSource.data.findIndex(n => n == siblingNodes.previous);
                this.dataSource.data.splice(previousInd, 0, currNode);
            } else console.log(`Nothing to do when both next and previous are empty`);
        }
        this.saveExpandingNodes();
        this.dataChange.next(this.dataClone);
    }

    handleDragStarted(evt: CdkDragStart) {
        console.log(evt);
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