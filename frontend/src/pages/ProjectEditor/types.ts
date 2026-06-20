export interface SpatialVector {
    x: number;
    y: number;
    z: number;
}

export interface AssetTransform {
    position: SpatialVector;
    rotation: SpatialVector;
    scale: SpatialVector;
}

export interface Asset {
    id: string;
    filename: string;
    fileType: string;
    fileSize: number;
    url: string;
    storageKey: string;
    transform: AssetTransform | null;
    createdAt: string;
}

export type ProjectStatus = 'draft' | 'published' | 'archived';

export interface Project {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type Axis = 'x' | 'y' | 'z';