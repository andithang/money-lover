import { SelectionModel } from '@angular/cdk/collections';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FlatTreeControl } from '@angular/cdk/tree';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatTreeFlattener, MatTreeFlatDataSource } from '@angular/material/tree';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '@shared/services/authorization.service';
import { APP_ACTIONS } from 'app/actions';
import { Module } from 'app/model/module.model';
import { TreeModuleItem, TreeModuleItemFlatNode } from 'app/model/tree-module-item.model';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { ModuleService } from '../modules/module.service';
import { CONSTS } from 'app/consts';

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

    /** The new item's name */
    newItemName = '';

    treeControl: FlatTreeControl<TreeModuleItemFlatNode>;

    treeFlattener: MatTreeFlattener<TreeModuleItem, TreeModuleItemFlatNode>;

    dataSource: MatTreeFlatDataSource<TreeModuleItem, TreeModuleItemFlatNode>;

    /** The selection for checklist */
    checklistSelection = new SelectionModel<TreeModuleItemFlatNode>(
        true /* multiple */
    );
    /** keep a copy of data to update the dataSource when any item changed */
    private dataChange = new BehaviorSubject<TreeModuleItem[]>([]);

    get data(): TreeModuleItem[] {
        return structuredClone(this.dataSource.data);
    }
    listModules: Module[] = [];
    permissionChecked = new Subject<boolean>();
    readonly APP_ACTIONS = APP_ACTIONS;
    private destroy$ = new Subject<void>();

    constructor(
        private moduleService: ModuleService,
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
            this.dataSource.data = data
        });
        this.authorService.getAllowActionsOnModule(location.pathname).subscribe(({actions}) => {
            this.authorService.allowActionsChange$.next(actions);
            this.permissionChecked.next(true);
        }, () => this.permissionChecked.next(true))
    }

    ngOnInit(): void {
        this.permissionChecked.pipe(takeUntil(this.destroy$)).subscribe((checked) => {
            if(checked) this.getListModules()
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

    /**
     * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
     */
    transformer = (node: TreeModuleItem, level: number) => {
        const existingNode = this.nestedNodeMap.get(node);
        const flatNode: TreeModuleItemFlatNode =
            existingNode && existingNode.module && existingNode.module._id === (node.module ? node.module._id : '')
                ? existingNode
                : { expandable: false, level: 0, module: null, moduleId: '', tempModuleId: '' };
        flatNode.module = node.module;
        flatNode.moduleId = node.module ? node.module._id: '';
        flatNode.tempModuleId = node.module ? node.module._id: '';
        flatNode.level = level;
        flatNode.expandable = !!node.children?.length;
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
        const parentNode = this.flatNodeMap.get(node);
        parentNode.children = [...parentNode.children, { module: null, children: [] }];
        this.dataChange.next(this.data);
        this.treeControl.expand(node);
    }

    /** Save the node to database */
    saveNode(node: TreeModuleItemFlatNode) {
        const nestedNode = this.flatNodeMap.get(node);
        node.moduleId = node.tempModuleId;
        nestedNode.module = this.listModules.find(m => m._id == node.moduleId);
        this.dataChange.next(this.data);
    }

    addNewRoot() {
        this.dataChange.next([...this.data, { children: [], module: null }]);
    }

    onSelectModule(moduleId: string, node: TreeModuleItemFlatNode) {
        node.tempModuleId = moduleId;
    }

    /** on drop an item into a position */
    drop(evt: CdkDragDrop<string[]>) {
        const { currentIndex, previousIndex } = evt;
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
}