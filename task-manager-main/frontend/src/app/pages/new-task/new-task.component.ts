import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Route, Router } from '@angular/router';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-new-task',
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.scss']
})
export class NewTaskComponent implements OnInit {

  constructor(private taskService: TaskService, private route: ActivatedRoute, private router: Router) { }

  listId: string = "";

  ngOnInit(): void {
    this.route.params.subscribe(
      (params: Params) => {
        this.listId = params['listId'];
        console.log(this.listId);
      }
    )
  }

  createNewTask(title: string) {
    this.taskService.createTask(title, this.listId).subscribe((res: any) => {
      this.router.navigate(['../'], {relativeTo: this.route});
    })

  }

}
