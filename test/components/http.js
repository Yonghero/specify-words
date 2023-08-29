import { http1, http12, $rest } from './http1'
import { obj } from './urls'

export function http() {
  fetch(obj.a.b)

  http12()
  http1()

  // fetch('http://httpgfffd')

  fetch('http://http-get', {
    method: 'get',
  })

  $rest.c.post()
}
