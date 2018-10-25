# tsjsonrpc
TypeScript-библиотека декораторов для абстрагирования от уровней транспорта и преобразования данных

## Концепция
JSONRPC - протокол для обмена данными между клиентом и сервером. Имеет строгий формат тела сообщений и правила
сетевого доступа.

Для абстрагирования от лишней мета-информации тела сообщения и чтобы избежать дублирования кода транспортного уровня
написана эта библиотека, реализующая декларативный подход. Условно это можно назвать маппингом наших фронтовых
методов на методы удаленного сервера.

Библиотека не зависит от используемого(или не используемого) в вашем проекте фреймворка.

## Мотивация
Ниже представлен совсем сырой кусок кода, который общался с jsonrpc-сервером без всяких оберток
```typescript
interface IJsonRpcResponse<T> {
  id: string;
  jsonrpc: string;
  data?: T;
  error?: object;
}

function executeRemoteMethod<T>(
  serverUrl: string, endpoint: string, method: string, payload?: object
): Promise<T> {
  const url = `${serverUrl}/${endpoint}`;
  const request = {
    id: Math.random().toString(),
    jsonrpc: '2.0',
    method
  };
  if (payload) {
    request.params = payload;
  }

  return axios.post(url, request).catch(
    err => {
      // Обработать и выплюнуть универсальный объект ошибки с информацией о проблеме сети
    }
  ).then((response: IJsonRpcResponse<T>) => {
    if (response.data) {
      // Обработать и отдать сырые данные из ответа
    } else {
      // Обработать и выплюнуть ошибку из ответа
    }
  });
}

executeRemoteMethod('http://api.com', 'services/auth', 'login', {login: 12345}).catch(err => {
  // Обработат универсальную ошибку сети или бизнес-логики
}).then(response => {
  // Работать с данным
})
```
Что не нравится:
- из проекта в проект тащить этот код + еще всякие интерфейсы
- императивный стиль
- можно совершенствовать код дальше и порождать новые абстракции, но нет универсальности
- использование конкретного транспорта

Что хочется:
- универсальную библиотеку со всеми нужными интерфейсами
- чтобы она была конфигурируема
- декларативный стиль
- абстрагироваться от конкретного транспорта

## Реализация
Библиотека предоставляет набор интерфейсов над протоколом jsonrpc, декоратор для сервера jsonrpc-службы и фабрику
кастомизируемых декораторов методов, которую каждый потребитель будет использовать чтобы получить нужный именно ему
декоратор метода.

Почему фабрика декораторов? Невозможно предусмотреть потребности каждого пользователя библиотеки в плане
использования декораторов и вызова удаленных методов. Каждому может потребоваться специфичное преобразование объектов
 запроса, специфичное и конфигурируемое преобразование объекта ответа.

Библиотеке необходимо подсунуть экземпляр транспорта, который представляет из себя адаптер над вашим транспортным
решением(axios, fetch, angular-http, etc)

## how to use
#### 1
В первую очередь необходимо реализовать класс-адаптер для транспорта и предоставить его:
```typescript
import { IHttpClient } from 'tsjsonrpc';

class HttpClientAdapter implements IHttpClient {
  // Каким угодно способом закиньте ваш класс транспорта в адаптер
  // В данном случае - внедрение через конструктор
  constructor(private httpService: HttpClient) {}

  // Обязательный и единственный метод, который будет использоваться библиотекой внутри
  // Сигнатура проста - конечный готовый урл, на который пойдет запрос и тело запроса
  post(url: string, params: object): Promise<any> {
    // Здесь реализуйте вызов вашего транспорта с передачей ему урла и данных
    // В нашем случае здесь ангуляр и его HttpService
    return this.httpService.post(url, params).toPromise();
  }
}
```
Урл библиотека формирует по следующей схеме: `${apiServerUrl}/${service}/${endpoint}`
Транспорт можно задавать на уровне класса (в декораторе класса) и на уровне метода (в декораторе метода)

#### 2
После этого нужно сконфигурировать декоратор, которым будет оборачиваться ваши классы:
```typescript
import { TSJsonRpc } from 'tsjsonrpc';

const JsonRpcService = TSJsonRpc.makeClassDecorator({
  apiServerUrl: 'https://your-domain.com/api/v1',
  httpClient?: new HttpClientAdapter(httpClient)
});
```
Декоратор принимает эндпоинт, на котором находится jsonrpc-сервер
httpClient обычно удобнее задавать здесь

#### 3
Подход маппинга заключается в создании класса для общения с конкретным эндпоинтом.
```typescript
// JsonRpcMethod еще не описан, о нем - в следующем шаге
import { JsonRpcService, JsonRpcMethod } from './../utils/jsonrpc';

@JsonRpcService('services/auth/private')
class AuthTransportService {
  @JsonRpcMethod({ method: 'login' })
  login(request: LoginRequest, options?: any): Promise<LoginResponse> {
    return null;
  }
}
```
Описанный класс вызов каждого метода, обернутого декоратором, будет проксировать в транспорт, гонять на сервер и делать
всякие дела.

В данном коде появляется несколько новых вещей, которые реализовывать в ридми не буду, но их стоит объяснить:
- @JsonRpcMethod - декоратор, который вы получите используя фабрику декораторов из библиотеки на следующем шаге
- LoginRequest - модель запроса, которую сможет преобразовать декоратор в сырые данные для отправки по сети.
Конфигурируете его вы
- LoginResponse - интерфейс данных ответа от сервера, пришедших в поле data. Конфигурируете его вы

#### 4
Предпоследнее и самое хардкорное - создать ваш уникальный декортоар метода и настроить ему пре- и пост-процессинг
запросов. Выше описанный LoginResponse может быть не только интерфейсом сырых данных, но и любым вашем типом, к
которому вы можете преобразовать данные ответа в постпроцессоре.
```typescript
import { TSJsonRpc } from 'tsjsonrpc';

export const JsonRpcMethod = TSJsonRpc.makeMethodDecorator(
  (request?: ISerializable) => request ? request.toServer() : void 0,
  (response: any, payload: any) => {
    // Здесь можно что-нибудь сделать с объектом response, который вернул ваш адаптер из метода post
    // payload - хитрая штука - это все поля из конфига, переданного в декоратор, но без поля method.
  },
  transportFactory?: (): IHttpClient => {
    // return http client c методом post
  }
)
```

использование декоратора видно выше, но помимо метода в конфиг можно передать все что угодно, и оно провалится в
payload процессора ответа.
transportFactory - фабрика http client-ов, в большинстве случаев удобнее задавать транспорт в декораторе класса,
но если имеется несколько json-rpc методов на одном урле, и методы нужно вызывать с разными headers, удобно держать
все методы в одном классе и на уровне метода задавать транспорт.

Например
```typescript
@JsonRpcMethod({ method: 'login', responseModel: AwesomeModelClass, someOtherData: 123 })
```
Постпроцессор в аргумент payload получит объект `{ responseModel, someOtherData }`. В нашем случае используется как
раз responseModel, в которую кладется конструктор класса со статичным свойством fromServer, превращающий сырые данные
 в нашу богатую модель.

```typescript
@JsonRpcMethod({ method: 'login', responseModel: LoginResponse })
login(): Promise<LoginResponse> {} // На выходе в промисе будут не сырые данные, а богатая модель
```

#### 4
Можно пользоваться только декораторами методов

```typescript
@JsonRpcMethod({ method: 'apiUrl'})
login(requestBody: JsonprcRequestBody): Promise<LoginResponse> {}

```

здесь requestBody - это тело json-rpc метода, сформированное в соответствии со стандартом


## Боевой пример получения декоратора
```typescript

interface IResponsePostprocessorPayload {
  responseModel?: { fromServer(rawData: object): any };
}

export const JsonRpcMethod = TSJsonRpc.makeMethodDecorator<
  ISerializable,
  IResponsePostprocessorPayload
>(
  (requestObject?: ISerializable) => requestObject ? requestObject.toServer() : null,
  (responseObject: Promise<IJsonRpcResponse>, payload: IResponsePostprocessorPayload) => {
    return responseObject.catch(httpError => {
      throw JsonRpcError.makeHttpError(httpError.status, httpError.statusText);
    }).then(res => {
      if (res.error) {
        throw JsonRpcError.makeRpcError(res.error);
      } else {
        return payload.responseModel ? payload.responseModel.fromServer(res.result) : void 0;
      }
    });
  }
);

```

## API

### TSJsonRpc.makeClassDecorator(config: { apiServerUrl: string, httpClient: { post(url: string, data: object): any } })
Декоратор для класса, в котором будут удаленные методы

### JsonRpcService.makeMethodDecorator<TRequest, TPayload>(requestProcessor: (request: TRequest) => any, responseProcessor(response: any, payload: TPayload) => any, transportFactory?: () => IHttpClient )
Фабрика получения декоратора метода