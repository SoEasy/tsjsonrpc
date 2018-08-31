import {
  IHttpClient,
  IJsonRpcMethodConfig,
  IJsonRpcRequest,
  IJsonRpcServiceConfig
} from "./interfaces";
import { guid } from './utils/guid';
import { stripSlash } from './utils/strip-slash';

export class JsonRpcService {
  private static apiServerUrl?: string;
  private static httpClient: IHttpClient;

  private static getParamsObj(method: string, params?: object): IJsonRpcRequest {
    const retVal: IJsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      id: guid()
    };
    if (params) {
      retVal.params = params;
    }

    return retVal;
  }

  private static makeUrl(endpoint?: string): string {
    const { apiServerUrl } = JsonRpcService;

    return [
      apiServerUrl,
      endpoint ? stripSlash(endpoint) : void 0
    ].filter(v => !!v).join('/');
  }

  static configure(config: IJsonRpcServiceConfig): void {
    this.httpClient = config.httpClient;
    this.apiServerUrl = config.apiServerUrl ? stripSlash(config.apiServerUrl) : void 0;
  }

  // tslint:disable-next-line
  static make(endpoint?: string): (target: any) => void {
    // tslint:disable-next-line
    return (target: any): void => {
      // tslint:disable-next-line
      target.execute = function(method: string, data: object) {
        const { httpClient, makeUrl } = JsonRpcService;
        const apiUrl: string = makeUrl(endpoint);

        return httpClient.post(apiUrl, JsonRpcService.getParamsObj(method, data));
      };
    };
  }

  static makeMethodDecorator<TRequest, TConfigPayload>(
    // tslint:disable-next-line
    requestPreprocessor: (request: TRequest) => any,
    // tslint:disable-next-line
    responsePostprocessor: (response: any, config: TConfigPayload) => any
  // tslint:disable-next-line
  ): (config: IJsonRpcMethodConfig<TConfigPayload>) => any {
    return (config: IJsonRpcMethodConfig<TConfigPayload>) => {
      // tslint:disable-next-line
      return (target: any, propertyKey: string | Symbol, descriptor: TypedPropertyDescriptor<any>) => {
        // Декоратор метода работает раньше декоратора конструктора, поэтому execute будем получать в рантайме
        const targetConstructor = target.constructor;

        // tslint:disable-next-line
        descriptor.value = function (request: TRequest) {
          return responsePostprocessor(
            targetConstructor.execute(config.method, requestPreprocessor(request)),
            config
          );
        };

        return descriptor;
      }
    }
  }
}
