import { Injectable } from '@nestjs/common';
import {supabase} from '../../config/supabase.config';
@Injectable()
export class ServicesService {
    //write a method that gets every thing from the service table
    async findAll(){
        const {data, error}= await supabase
        .from('services')
        .select("*")
        .order("created_at",{ascending:false});

        if(error){
            throw new Error(`Database error: ${error.message}`);    
        }
        return data;

    }
    //to get one service by id
    async findOne(id:string){
        const {data, error}= await supabase
        .from('services')
        .select("*")
        .eq("id",id)
        .single();

        if(error){
            throw new Error(`service not found: ${error.message}`);  
        }
        return data

    }
}
