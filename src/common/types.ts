import { ResourceParams } from "remoteResourceSlice";

export type ApiCallStatus = 'INIT' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR';

export interface ResourceHookParams<Params extends ResourceParams = ResourceParams> {
    resourceKey?: string;
    autoLoad?: boolean;
    autoLoadParams?: Partial<Params>;
    autoRemove?: boolean;
    disconnected?: boolean;
  }
