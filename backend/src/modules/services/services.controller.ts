import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('services') //this is my base url with /services
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    //to return all the services using get method
    @Get()
    async findAll(){
        return await this.servicesService.findAll();
    }

// to return based on the service id
    @Get(':id')
    async findOne(@Param('id') id: string){
        return await this.servicesService.findOne(id);
    }
}
