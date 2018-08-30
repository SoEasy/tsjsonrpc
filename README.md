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

class HttpClientApater implements IHttpClient {
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

#### 2
После этого нужно сконфигурировать библиотеку:
```typescript
import { JsonRpcService } from 'tsjsonrpc';

JsonRpcService.configure({
  apiServerUrl: 'https://your-domain.com/api/v1',
  httpClient: new HttpClientAdapter(httpClient)
});
```

#### 3
Подход маппинга заключается в создании класса для общения с конкретным эндпоинтом.
```typescript
import { JsonRpcService } from 'tsjsonrpc';
import { JsonRpcMethod } from './../utils/jsonrpc';

@JsonRpcService.make({ service: 'services/auth', endpoint: 'private' })
class AuthTransportService {
  @JsonRpcMethod({ method: 'login' })
  login(request: LoginRequest): Promise<LoginResponse> {
    return null;
  }
}
```
Описанный класс вызов каждого метода, обернутого декоратором, будет проксировать в транспорт, гонять на сервер и делать 
всякие дела.

В данном коде появляется несколько новых вещей, которые реализовывать в ридми не буду, но их стоит объяснить:
- @JsonRpcMethod - декоратор, который вы получите используя фабрику декораторов из библиотеки на следующем шаге
- LoginRequest - модель запроса, которую сможет преобразовать декоратор в сырые данные для отправки по сети
- LoginResponse - интерфейс данных ответа от сервера, пришедших в поле data

#### 4
Предпоследнее и самое хардкорное - создать ваш уникальный декортоар метода и настроить ему пре- и пост-процессинг 
запросов. Выше описанный LoginResponse может быть не только интерфейсом сырых данных, но и любым вашем типом, к 
которому вы можете преобразовать данные ответа в постпроцессоре.
```typescript
import { JsonRpcService } from 'tsjsonrpc';

export const JsonRpcMethod = JsonRpcService.makeMethodDecorator(
  (request?: ISerializable) => request ? request.toServer() : void 0,
  (response: any, payload: any) => {
    // Здесь можно что-нибудь сделать с объектом response, который вернул ваш адаптер из метода post
    // payload - хитрая штука - это все поля из конфига, переданного в декоратор, но без поля method.
  }
)
```

использование декоратора видно выше, но помимо метода в конфиг можно передать все что угодно, и оно провалится в 
payload процессора ответа.

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
 
## Боевой пример получения декоратора
```typescript

interface IResponsePostprocessorPayload {
  response?: { fromServer(rawData: object): any };
}

export const JsonRpcMethod = JsonRpcService.makeMethodDecorator<
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
        return payload.response ? payload.response.fromServer(res.result) : void 0;
      }
    });
  }
);

``` 
 
## API

### JsonRpcService.make(config: { service: string, endpoint: string })
Декоратор для класса, в котором будут удаленные методы

### JsonRpcService.config(config: { apiServerUrl: string, httpClient: { post(url: string, data: object): any } })
Конфиг, который надо вызвать на старте приложения

### JsonRpcService.makeMethodDecorator<TRequest, TPayload>(requestProcessor: (request: TRequest) => any, responseProcessor(response: any, payload: TPayload) => any )
Фабрика получения декоратора метода